import { useEffect, useRef, useState } from "preact/hooks";
import { ConfigStore } from "../store/configStore.js";
import {
  COMPLETED_THRESHOLD,
  HistoryStore,
  chapterSlugToLabel,
  formatHistoryAge,
} from "../store/historyStore.js";
import type { HistoryEntry } from "../store/historyStore.js";
import { FilterStore } from "../store/filterStore.js";
import type { HiddenSeries } from "../store/filterStore.js";
import { DEFAULTS, isConfigKey } from "../config/defaults.js";
import { formatPercent, t, tPlural } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import type { OnConfigChanged } from "./settingsControls.js";
import { searchItemId } from "./settingsSearch.js";

// Each button is its own search result, so "export" or "reset" finds these actions.
export type DataActionSpec = readonly [action: string, label: MessageKey, danger?: boolean];

export const HISTORY_ACTIONS: readonly DataActionSpec[] = [
  ["export-history", "data.exportHistory"],
  ["import-history", "data.importHistory"],
  ["clear-history", "data.clearHistory", true],
];

export const SETTINGS_ACTIONS: readonly DataActionSpec[] = [
  ["export", "data.exportSettings"],
  ["import", "data.importSettings"],
  ["reset", "data.reset", true],
];

// Feedback shows on the button itself, so it reaches the button that was pressed.
type Flash = (text: string) => void;

export interface DataActionHandlers {
  onConfigChanged: OnConfigChanged;
  // Refreshes the history list after its entries change.
  onHistoryChanged?: (() => void) | undefined;
  // Settings import and reset replace every value, so the modal's contents are rebuilt.
  onSettingsChanged?: (() => void) | undefined;
}

function copyJsonToClipboard(json: string, promptLabel: string, flash: Flash): void {
  const clipboard = navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    clipboard
      .writeText(json)
      .then(() => flash(t("feedback.copied")))
      .catch(() => window.prompt(promptLabel, json));
  } else {
    window.prompt(promptLabel, json);
  }
}

function applyImportedConfig(parsed: Record<string, unknown>, handlers: DataActionHandlers): void {
  Object.keys(DEFAULTS).forEach((key) => {
    if (!isConfigKey(key)) return;
    if (!(key in parsed)) return;
    ConfigStore.set(key, parsed[key]);
  });
  handlers.onConfigChanged("themePreset", ConfigStore.get("themePreset"));
  handlers.onConfigChanged("language", ConfigStore.get("language"));
}

function runDataAction(action: string, flash: Flash, handlers: DataActionHandlers): void {
  if (action === "export") {
    copyJsonToClipboard(JSON.stringify(ConfigStore.getAll(), null, 2), t("data.promptCopySettings"), flash);
    return;
  }

  if (action === "export-history") {
    const json = JSON.stringify({ version: 1, history: HistoryStore.load() }, null, 2);
    copyJsonToClipboard(json, t("data.promptCopyHistory"), flash);
    return;
  }

  if (action === "import-history") {
    const raw = window.prompt(t("data.promptPasteHistory"));
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      flash(t("feedback.invalidJson"));
      return;
    }
    const count = HistoryStore.importEntries(parsed);
    if (count === 0) {
      flash(t("feedback.invalidJson"));
      return;
    }
    handlers.onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
    handlers.onHistoryChanged?.();
    flash(t("feedback.importedHistory", { count }));
    return;
  }

  if (action === "import") {
    const raw = window.prompt(t("data.promptPasteSettings"));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      applyImportedConfig(parsed as Record<string, unknown>, handlers);
      flash(t("feedback.importedSettings"));
      handlers.onSettingsChanged?.();
    } catch {
      flash(t("feedback.invalidJson"));
    }
    return;
  }

  if (action === "reset") {
    if (!window.confirm(t("data.confirmReset"))) return;
    Object.keys(DEFAULTS).forEach((key) => {
      if (!isConfigKey(key)) return;
      ConfigStore.set(key, DEFAULTS[key]);
    });
    handlers.onConfigChanged("themePreset", ConfigStore.get("themePreset"));
    handlers.onConfigChanged("language", ConfigStore.get("language"));
    handlers.onSettingsChanged?.();
    return;
  }

  if (action === "clear-history") {
    if (!window.confirm(t("data.confirmClearHistory"))) return;
    HistoryStore.clear();
    handlers.onHistoryChanged?.();
    flash(t("feedback.cleared"));
  }
}

interface DataActionButtonProps {
  action: string;
  label: string;
  danger: boolean;
  handlers: DataActionHandlers;
}

function DataActionButton({ action, label, danger, handlers }: DataActionButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The label is swapped for the feedback text for a moment, then restored.
  const flash: Flash = (text) => {
    window.clearTimeout(timer.current);
    setFeedback(text);
    timer.current = window.setTimeout(() => setFeedback(null), 1400);
  };

  return (
    <button
      type="button"
      class={danger ? "au-data-btn au-data-btn-danger" : "au-data-btn"}
      data-au-item={searchItemId("action", action)}
      onClick={() => runDataAction(action, flash, handlers)}
    >
      {feedback ?? label}
    </button>
  );
}

export function DataActions({ actions, handlers }: { actions: readonly DataActionSpec[]; handlers: DataActionHandlers }) {
  return (
    <div class="au-data-actions">
      {actions.map(([action, labelKey, danger]) => (
        <DataActionButton
          key={action}
          action={action}
          label={t(labelKey)}
          danger={danger === true}
          handlers={handlers}
        />
      ))}
    </div>
  );
}

interface HistorySnapshot {
  now: number;
  entries: [string, HistoryEntry][];
}

function loadHistory(): HistorySnapshot {
  const now = Date.now();
  const entries = Object.entries(HistoryStore.load()).sort(([, a], [, b]) => b.lastTs - a.lastTs);
  return { now, entries };
}

export function HistorySection({ onConfigChanged }: { onConfigChanged: OnConfigChanged }) {
  const [snapshot, setSnapshot] = useState(loadHistory);
  const [query, setQuery] = useState("");

  // Import and clear rebuild the list from the store, and the search box starts empty again.
  const refresh = () => {
    setSnapshot(loadHistory());
    setQuery("");
  };

  const needle = query.trim().toLowerCase();
  const rows = snapshot.entries.map(([key, entry]) => {
    const title = entry.title || key;
    return { key, entry, title, isMatch: title.toLowerCase().includes(needle) };
  });
  const matchCount = rows.filter((row) => row.isMatch).length;
  const noteText = rows.length === 0 ? t("history.empty") : matchCount === 0 ? t("history.noMatches") : "";

  const remove = (key: string) => {
    HistoryStore.remove(key);
    setSnapshot((prev) => ({ ...prev, entries: prev.entries.filter(([k]) => k !== key) }));
    onConfigChanged("trackReadingHistory", ConfigStore.get("trackReadingHistory"));
  };

  return (
    <>
      <DataActions actions={HISTORY_ACTIONS} handlers={{ onConfigChanged, onHistoryChanged: refresh }} />
      <div data-au-history>
        <input
          type="search"
          class="au-history-search"
          placeholder={t("history.search")}
          aria-label={t("history.searchLabel")}
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <div class="au-data-note" hidden={noteText === ""}>
          {noteText}
        </div>
        <ul class="au-history-list">
          {rows.map(({ key, entry, title, isMatch }) => {
            const progress =
              entry.lastProgress >= COMPLETED_THRESHOLD ? t("history.finished") : formatPercent(entry.lastProgress);
            const meta = [chapterSlugToLabel(entry.lastChapter), progress, formatHistoryAge(entry.lastTs, snapshot.now)]
              .filter(Boolean)
              .join(" • ");
            return (
              <li key={key} class="au-history-item" hidden={!isMatch}>
                <div class="au-history-info">
                  <div class="au-history-title-row">
                    <a class="au-history-title" href={entry.lastHref}>
                      {title}
                    </a>
                    {key.startsWith("novel:") ? <span class="au-history-tag">{t("history.novelTag")}</span> : null}
                  </div>
                  <div class="au-history-meta">
                    <span>{meta}</span>
                    <span>{tPlural("history.readCount", entry.read.length)}</span>
                  </div>
                </div>
                <button type="button" class="au-data-btn" onClick={() => remove(key)}>
                  {t("history.remove")}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

interface FilterState {
  hidden: HiddenSeries[];
  genres: string[];
  // Lowercased, because genre names are matched case-insensitively.
  excluded: Set<string>;
}

function loadFilters(): FilterState {
  return {
    hidden: FilterStore.listHidden(),
    excluded: new Set(FilterStore.listExcludedGenres().map((name) => name.toLowerCase())),
    genres: FilterStore.listGenreNames().sort((a, b) => a.localeCompare(b)),
  };
}

export function FiltersSection({ onConfigChanged }: { onConfigChanged: OnConfigChanged }) {
  const [state, setState] = useState(loadFilters);

  // Each change reloads from the store, so the lists always show what was saved.
  const unhide = (path: string) => {
    FilterStore.unhideSeries(path);
    onConfigChanged("seriesFilters", ConfigStore.get("seriesFilters"));
    setState(loadFilters());
  };

  const setExcluded = (name: string, excluded: boolean) => {
    FilterStore.setGenreExcluded(name, excluded);
    onConfigChanged("seriesFilters", ConfigStore.get("seriesFilters"));
    setState(loadFilters());
  };

  return (
    <div data-au-filters>
      <div class="au-filter-heading">{t("filters.hiddenHeading")}</div>
      {state.hidden.length === 0 ? (
        <div class="au-data-note">{t("filters.noHidden")}</div>
      ) : (
        <ul class="au-filter-list">
          {state.hidden.map((series) => (
            <li key={series.path} class="au-filter-item">
              <span class="au-filter-name">{series.title}</span>
              <button type="button" class="au-data-btn" onClick={() => unhide(series.path)}>
                {t("filters.unhide")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div class="au-filter-heading">{t("filters.genresHeading")}</div>
      <div class="au-data-note">{t("filters.genresNote")}</div>
      <div class="au-filter-genres">
        {state.genres.map((name) => (
          <label key={name} class="au-filter-genre">
            <input
              type="checkbox"
              checked={state.excluded.has(name.toLowerCase())}
              onChange={(e) => setExcluded(name, e.currentTarget.checked)}
            />
            <span>{name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function SettingsDataSection({
  onConfigChanged,
  onSettingsChanged,
}: {
  onConfigChanged: OnConfigChanged;
  onSettingsChanged: () => void;
}) {
  return (
    <>
      <div class="au-data-note">{t("data.note")}</div>
      <DataActions actions={SETTINGS_ACTIONS} handlers={{ onConfigChanged, onSettingsChanged }} />
    </>
  );
}
