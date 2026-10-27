import { render } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { SETTINGS_PAGES } from "../config/settingsLayout.js";
import type {
  GroupContent,
  SettingsGroup,
  SettingsPage,
  SettingsPageKey,
} from "../config/settingsLayout.js";
import { ConfigStore } from "../store/configStore.js";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import packageJson from "../../package.json";
import { t } from "../i18n/index.js";
import { ChecklistItemView, SettingRowView } from "./settingsControls.js";
import type { OnConfigChanged, WriteConfig } from "./settingsControls.js";
import {
  FiltersSection,
  HISTORY_ACTIONS,
  HistorySection,
  SETTINGS_ACTIONS,
  SettingsDataSection,
} from "./settingsPanels.js";
import { ShortcutsEditor, shortcutGroups, shortcutHelp } from "./settingsShortcuts.js";
import {
  ClearIcon,
  CloseIcon,
  PAGE_ICONS,
  SearchIcon,
  rocksEmblemSvg,
} from "./settingsIcons.js";
import { matchesSearch, searchItemId, searchText } from "./settingsSearch.js";

const APP_VERSION = packageJson.version;
const AUTHOR_NAME = "Rocks";
const AUTHOR_URL = "https://github.com/Rhgx";
const RELEASES_URL = "https://github.com/Rhgx/asura-utils/releases";

export class SettingsModalView {
  readonly onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void;
  modalOpen: boolean;
  activePage: SettingsPageKey;
  modalCleanup: (() => void) | null;

  constructor(onConfigChanged: (key: ConfigKey, value: AppConfig[ConfigKey]) => void) {
    this.onConfigChanged = onConfigChanged;
    this.modalOpen = false;
    this.activePage = "reader";
    this.modalCleanup = null;
  }

  createHeaderButton() {
    const insertionTarget = this.findHeaderButtonTarget();
    if (!insertionTarget || !insertionTarget.parentNode) return;

    let btn = document.getElementById("au-settings-btn-main");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "au-settings-btn-main";
      btn.className = "au-settings-btn";
      btn.setAttribute("type", "button");
      btn.title = t("dock.settings");
      btn.setAttribute("aria-label", t("dock.openSettings"));
      btn.innerHTML =
        '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      btn.onclick = (e) => {
        e.preventDefault();
        this.toggleModal();
      };
    }

    if (btn.parentNode !== insertionTarget.parentNode) {
      insertionTarget.parentNode.insertBefore(btn, insertionTarget);
    } else if (btn.nextSibling !== insertionTarget) {
      insertionTarget.parentNode.insertBefore(btn, insertionTarget);
    }
  }

  findHeaderButtonTarget(): Element | null {
    // The user menu island is in the header for both signed-in and signed-out visitors.
    // Signed-in profile links only exist inside its closed dropdown, so they cannot anchor the button.
    const userMenu = document.querySelector('header astro-island[component-url*="UserMenu"]');
    if (userMenu) {
      // Insert beside the wrapper that sits in the header's flex row; inside a block wrapper the button stacks above the row.
      let target: Element = userMenu;
      while (
        target.parentElement &&
        target.parentElement.tagName !== "HEADER" &&
        window.getComputedStyle(target.parentElement).display !== "flex"
      ) {
        target = target.parentElement;
      }
      return target;
    }

    const profileLinks = document.querySelectorAll<HTMLElement>(
      'header a[href*="/login"], header a[href*="/dashboard"], header a[href*="/account"], header a[href*="/user/"]'
    );
    if (profileLinks.length === 0) return null;

    const targetAnchor =
      Array.from(profileLinks).find((el) => el.offsetParent !== null) ||
      profileLinks[0]!;
    return (
      targetAnchor.closest(".mobile-menu-hide") ||
      targetAnchor.closest(".profile-menu-hide") ||
      targetAnchor.closest("astro-island") ||
      targetAnchor
    );
  }

  // A page opens the modal on that section; without one it reopens on the last section used.
  toggleModal(page?: SettingsPageKey) {
    const existing = document.getElementById("au-modal-overlay");
    if (existing) {
      if (typeof this.modalCleanup === "function") {
        this.modalCleanup();
      } else {
        existing.remove();
        this.modalOpen = false;
      }
    } else {
      if (page) this.activePage = page;
      this.renderModal();
      this.modalOpen = true;
    }
  }

  renderModal() {
    const overlay = document.createElement("div");
    overlay.id = "au-modal-overlay";
    document.body.appendChild(overlay);

    let isClosing = false;
    let closeTimer = 0;

    // Rendering again with closing set is how the contents learn to end any shortcut capture.
    const renderContents = (closing: boolean) => {
      render(
        <SettingsModal
          initialPage={this.activePage}
          onPageChange={(page) => {
            this.activePage = page;
          }}
          onConfigChanged={this.onConfigChanged}
          onClose={close}
          closing={closing}
        />,
        overlay
      );
    };

    const finalizeClose = () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
      render(null, overlay);
      overlay.remove();
      this.modalCleanup = null;
      this.modalOpen = false;
    };

    const close = () => {
      if (isClosing) return;
      isClosing = true;

      overlay.classList.add("au-closing");
      renderContents(true);
      closeTimer = window.setTimeout(finalizeClose, 180);
    };
    this.modalCleanup = close;

    // Only a press on the backdrop itself closes the modal, not clicks inside the dialog.
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    renderContents(false);
  }
}

// Every searchable item, in the order the pages render them, so results list in page order.
// Built from the layout data rather than the DOM, so the index exists before anything is drawn.
interface SearchItem {
  id: string;
  page: SettingsPageKey;
  label: string;
  // Label matches are listed before matches that only appear in the description.
  labelText: string;
  text: string;
}

function contentActions(content: GroupContent | undefined) {
  if (content === "history") return HISTORY_ACTIONS;
  if (content === "settingsData") return SETTINGS_ACTIONS;
  return [];
}

function buildSearchIndex(): SearchItem[] {
  const items: SearchItem[] = [];
  const add = (id: string, page: SettingsPageKey, label: string, hint: string) => {
    items.push({ id, page, label, labelText: searchText(label), text: searchText(`${label} ${hint}`) });
  };

  for (const page of SETTINGS_PAGES) {
    for (const group of page.groups) {
      for (const row of group.rows ?? []) {
        add(searchItemId("row", row.key), page.key, t(`setting.${row.key}.label`), t(`setting.${row.key}.tooltip`));
      }
      for (const item of group.checklist ?? []) {
        add(searchItemId("check", item.key), page.key, t(`setting.${item.key}.label`), t(`setting.${item.key}.tooltip`));
      }
      for (const [action, labelKey] of contentActions(group.content)) {
        // Each data action is its own result, so "export" or "reset" finds these buttons.
        add(searchItemId("action", action), page.key, t(labelKey), "");
      }
      if (group.content === "shortcuts") {
        for (const [, fields] of shortcutGroups()) {
          for (const field of fields) {
            add(searchItemId("shortcut", field.key), page.key, t(field.labelKey), shortcutHelp(field));
          }
        }
      }
    }
  }

  return items;
}

// Everything the section panels need from the modal's state.
interface PanelContext {
  cfg: AppConfig;
  write: WriteConfig;
  closing: boolean;
  onConfigChanged: OnConfigChanged;
  onRemount: () => void;
}

function GroupContentView({ content, ctx }: { content: GroupContent; ctx: PanelContext }) {
  switch (content) {
    case "history":
      return <HistorySection onConfigChanged={ctx.onConfigChanged} />;
    case "filters":
      return <FiltersSection onConfigChanged={ctx.onConfigChanged} />;
    case "shortcuts":
      return <ShortcutsEditor cfg={ctx.cfg} write={ctx.write} closing={ctx.closing} />;
    case "settingsData":
      return <SettingsDataSection onConfigChanged={ctx.onConfigChanged} onSettingsChanged={ctx.onRemount} />;
  }
}

function GroupView({ group, ctx }: { group: SettingsGroup; ctx: PanelContext }) {
  return (
    <section class="au-group">
      {group.title ? <h3 class="au-group-title">{t(group.title)}</h3> : null}
      {group.rows ? (
        <div class="au-card">
          {group.rows.map((row) => (
            <SettingRowView key={row.key} row={row} cfg={ctx.cfg} write={ctx.write} />
          ))}
        </div>
      ) : null}
      {/* Checklist items keep the description in a hover tooltip so the grid stays compact. */}
      {group.checklist ? (
        <div class="au-card au-checklist">
          {group.checklist.map((item) => (
            <ChecklistItemView key={item.key} item={item} cfg={ctx.cfg} write={ctx.write} />
          ))}
        </div>
      ) : null}
      {group.content ? <GroupContentView content={group.content} ctx={ctx} /> : null}
    </section>
  );
}

function PageView({ page, active, ctx }: { page: SettingsPage; active: boolean; ctx: PanelContext }) {
  return (
    <div
      class={active ? "au-page active" : "au-page"}
      id={`au-page-${page.key}`}
      role="tabpanel"
      aria-labelledby={`au-nav-${page.key}`}
    >
      {page.groups.map((group, index) => (
        <GroupView key={index} group={group} ctx={ctx} />
      ))}
    </div>
  );
}

function NavButton({ page, active, onSelect }: { page: SettingsPage; active: boolean; onSelect: (key: SettingsPageKey) => void }) {
  const Icon = PAGE_ICONS[page.key];
  return (
    <button
      type="button"
      class={active ? "au-nav-btn active" : "au-nav-btn"}
      id={`au-nav-${page.key}`}
      role="tab"
      aria-controls={`au-page-${page.key}`}
      aria-selected={active ? "true" : "false"}
      onClick={() => onSelect(page.key)}
    >
      <Icon />
      <span>{t(page.title)}</span>
    </button>
  );
}

interface SettingsModalProps {
  initialPage: SettingsPageKey;
  onPageChange: (page: SettingsPageKey) => void;
  onConfigChanged: OnConfigChanged;
  onClose: () => void;
  closing: boolean;
}

// The active page lives here, above the contents, so a remount keeps the section the user was on.
function SettingsModal({ initialPage, onPageChange, onConfigChanged, onClose, closing }: SettingsModalProps) {
  const [page, setPage] = useState(initialPage);
  const [generation, setGeneration] = useState(0);

  return (
    <SettingsDialog
      key={generation}
      page={page}
      onSelectPage={(next) => {
        setPage(next);
        onPageChange(next);
      }}
      onConfigChanged={onConfigChanged}
      onClose={onClose}
      onRemount={() => setGeneration((n) => n + 1)}
      closing={closing}
    />
  );
}

interface SettingsDialogProps {
  page: SettingsPageKey;
  onSelectPage: (page: SettingsPageKey) => void;
  onConfigChanged: OnConfigChanged;
  onClose: () => void;
  onRemount: () => void;
  closing: boolean;
}

function SettingsDialog({ page, onSelectPage, onConfigChanged, onClose, onRemount, closing }: SettingsDialogProps) {
  // The snapshot is read from the store on mount, and kept in step with each write after that.
  const [cfg, setCfg] = useState<AppConfig>(() => ConfigStore.getAll());
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [reveal, setReveal] = useState<{ id: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef(0);
  // Labels are translated, so the index is built again whenever the contents remount.
  const index = useMemo(buildSearchIndex, []);
  const pageTitles = new Map(SETTINGS_PAGES.map((p) => [p.key, t(p.title)] as const));

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const write: WriteConfig = (key, raw) => {
    const value = ConfigStore.set(key, raw);
    setCfg(ConfigStore.getAll());
    onConfigChanged(key, value);
    // A language change rewrites every label in the modal, so it is rendered again in place.
    if (key === "language") onRemount();
    return value;
  };

  // Like T3 Code, a search swaps the section list for matching settings from every section.
  const trimmed = query.trim();
  const searching = trimmed !== "";
  const matches = useMemo(() => {
    if (trimmed === "") return [];
    // Matches on the setting name are listed before matches found only in a description.
    return index
      .filter((item) => matchesSearch(item.text, trimmed))
      .sort((a, b) => Number(matchesSearch(b.labelText, trimmed)) - Number(matchesSearch(a.labelText, trimmed)));
  }, [index, trimmed]);
  // Without results there is nothing to be active.
  const activeIndex = matches.length > 0 ? active : -1;

  // The active result follows the arrow keys, so keep it visible in its scrolling list.
  useLayoutEffect(() => {
    resultsRef.current?.querySelector(".au-result.active")?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, matches]);

  // The highlight runs after the target's section is shown, so it is found once the render has committed.
  useLayoutEffect(() => {
    if (!reveal) return;
    const el = modalRef.current?.querySelector<HTMLElement>(`[data-au-item="${reveal.id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.remove("is-flash");
    // Reading layout restarts the highlight animation when the same result is opened twice.
    void el.offsetWidth;
    el.classList.add("is-flash");
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => el.classList.remove("is-flash"), 1200);
  }, [reveal]);

  const selectPage = (next: SettingsPageKey) => {
    onSelectPage(next);
    // Every switch starts the section at the top.
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  // Opening a result shows its section and points at the setting; the results stay listed.
  const openResult = (position: number) => {
    const item = matches[position];
    if (!item) return;
    setActive(position);
    selectPage(item.page);
    setReveal({ id: item.id });
  };

  const clearSearch = () => {
    if (query === "") return;
    setQuery("");
    setActive(0);
  };

  const onSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && query !== "") {
      e.preventDefault();
      clearSearch();
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && matches.length > 0) {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + matches.length) % matches.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      openResult(activeIndex);
    }
  };

  const pageTitle = pageTitles.get(page) ?? "";

  return (
    <div
      id="au-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.title")}
      ref={modalRef}
    >
      <aside class="au-sidebar">
        <div class="au-search">
          <SearchIcon />
          <input
            type="search"
            class="au-search-input"
            ref={searchInputRef}
            placeholder={t("settings.search")}
            aria-label={t("settings.search")}
            autoComplete="off"
            spellcheck={false}
            value={query}
            onInput={(e) => {
              setQuery(e.currentTarget.value);
              setActive(0);
            }}
            onKeyDown={onSearchKeyDown}
          />
          <button
            type="button"
            class="au-search-clear"
            aria-label={t("settings.clearSearch")}
            hidden={query === ""}
            onClick={() => {
              clearSearch();
              searchInputRef.current?.focus();
            }}
          >
            <ClearIcon />
          </button>
        </div>
        <nav
          class="au-nav"
          role="tablist"
          aria-orientation="vertical"
          aria-label={t("settings.sections")}
          hidden={searching}
        >
          {SETTINGS_PAGES.filter((p) => !p.footer).map((p) => (
            <NavButton key={p.key} page={p} active={p.key === page} onSelect={selectPage} />
          ))}
          <div class="au-nav-spacer" aria-hidden="true"></div>
          {SETTINGS_PAGES.filter((p) => p.footer).map((p) => (
            <NavButton key={p.key} page={p} active={p.key === page} onSelect={selectPage} />
          ))}
        </nav>
        <div
          class="au-search-results"
          aria-label={t("settings.searchResults")}
          hidden={!searching}
          ref={resultsRef}
        >
          {searching && matches.length === 0 ? (
            <div class="au-search-empty">{t("settings.noResults")}</div>
          ) : null}
          {matches.map((item, position) => {
            const Icon = PAGE_ICONS[item.page];
            return (
              <button
                key={item.id}
                type="button"
                class={position === activeIndex ? "au-result active" : "au-result"}
                onClick={() => openResult(position)}
              >
                <Icon />
                <span class="au-result-text">
                  <span class="au-result-label">{item.label}</span>
                  <span class="au-result-page">{pageTitles.get(item.page) ?? ""}</span>
                </span>
              </button>
            );
          })}
        </div>
        <footer class="au-credits">
          <a class="au-credits-link" href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
            {/* The emblem is a bundled SVG file, set as markup so its paths parse as SVG. */}
            <span class="au-credits-avatar" dangerouslySetInnerHTML={{ __html: rocksEmblemSvg }}></span>
            {t("settings.madeBy", { author: AUTHOR_NAME })}
          </a>
          <span class="au-credits-version">
            <span class="au-credits-dot" aria-hidden="true">&middot;</span>
            <a class="au-credits-link" href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
              {`v${APP_VERSION}`}
            </a>
          </span>
        </footer>
      </aside>
      <div class="au-main">
        <div class="au-main-header">
          <h2 class="au-main-title">{pageTitle}</h2>
          <button type="button" class="au-close-btn" aria-label={t("settings.close")} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div class="au-content" ref={contentRef}>
          {SETTINGS_PAGES.map((p) => (
            <PageView
              key={p.key}
              page={p}
              active={p.key === page}
              ctx={{ cfg, write, closing, onConfigChanged, onRemount }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
