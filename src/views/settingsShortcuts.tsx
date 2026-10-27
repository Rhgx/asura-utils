import { useLayoutEffect, useState } from "preact/hooks";
import type { AppConfig, ConfigKey } from "../config/defaults.js";
import {
  KEYBIND_FIELDS,
  bindingToLabel,
  normalizeEventToBinding,
  type KeybindField,
} from "../config/keybinds.js";
import { t } from "../i18n/index.js";
import type { MessageKey } from "../i18n/index.js";
import { searchItemId } from "./settingsSearch.js";
import type { WriteConfig } from "./settingsControls.js";

// Fields grouped the way the editor shows them: cards in first-seen group order.
export function shortcutGroups(): [MessageKey, KeybindField[]][] {
  const groups = new Map<MessageKey, KeybindField[]>();

  for (const field of KEYBIND_FIELDS) {
    const fields = groups.get(field.groupKey) ?? [];
    fields.push(field);
    groups.set(field.groupKey, fields);
  }

  return Array.from(groups);
}

export function shortcutHelp(field: KeybindField): string {
  return "helpKey" in field ? t(field.helpKey) : "";
}

interface ShortcutRowProps {
  field: KeybindField;
  binding: string;
  listening: boolean;
  onCapture: (key: ConfigKey) => void;
  onReset: (field: KeybindField) => void;
}

function ShortcutRow({ field, binding, listening, onCapture, onReset }: ShortcutRowProps) {
  const label = t(field.labelKey);
  const help = shortcutHelp(field);

  return (
    <div
      class={listening ? "au-shortcut-row is-listening" : "au-shortcut-row"}
      data-au-item={searchItemId("shortcut", field.key)}
    >
      <div class="au-shortcut-meta">
        <div class="au-shortcut-name">{label}</div>
        {help ? <div class="au-shortcut-help">{help}</div> : null}
      </div>
      <div class="au-shortcut-actions">
        <button
          type="button"
          class={listening ? "au-shortcut-bind-btn is-listening" : "au-shortcut-bind-btn"}
          onClick={() => onCapture(field.key)}
        >
          <span class="au-shortcut-bind-label">
            {listening ? t("shortcuts.pressKey") : bindingToLabel(binding)}
          </span>
        </button>
        <button type="button" class="au-shortcut-reset-btn" onClick={() => onReset(field)}>
          {t("shortcuts.reset")}
        </button>
      </div>
    </div>
  );
}

interface ShortcutsEditorProps {
  cfg: AppConfig;
  write: WriteConfig;
  // Set while the modal fades out, which ends any capture in progress.
  closing: boolean;
}

export function ShortcutsEditor({ cfg, write, closing }: ShortcutsEditorProps) {
  // Only one binding can listen at a time, and the document listener exists only while one does.
  const [listening, setListening] = useState<ConfigKey | null>(null);

  // Closing drops the listener in the same commit, so no key can be bound during the fade-out.
  useLayoutEffect(() => {
    if (!listening || closing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Capture phase, so the key being bound never reaches the page's own shortcuts.
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setListening(null);
        return;
      }

      const isClearKey = event.key === "Backspace" || event.key === "Delete";
      const binding = isClearKey ? "" : normalizeEventToBinding(event);
      if (!isClearKey && !binding) return;

      write(listening, binding);
      setListening(null);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [listening, closing]);

  // Clicking the bind button that is already listening cancels; clicking another one switches.
  const capture = (key: ConfigKey) => setListening((current) => (current === key ? null : key));

  const reset = (field: KeybindField) => {
    write(field.key, field.defaultBinding);
    setListening((current) => (current === field.key ? null : current));
  };

  // The key names are markup supplied by code, so the translated sentence itself stays plain text.
  const introCopy = t("shortcuts.introCopy", {
    esc: "<b>Esc</b>",
    clear: "<b>Backspace/Delete</b>",
  });

  return (
    <div class="au-shortcut-editor">
      <div class="au-shortcut-intro">
        <div class="au-shortcut-intro-title">{t("shortcuts.introTitle")}</div>
        <div class="au-shortcut-intro-copy" dangerouslySetInnerHTML={{ __html: introCopy }} />
      </div>
      <div class="au-shortcut-cards">
        {shortcutGroups().map(([groupKey, fields]) => (
          <div class="au-shortcut-card">
            <div class="au-shortcut-card-title">{t(groupKey)}</div>
            <div class="au-shortcut-grid">
              {fields.map((field) => (
                <ShortcutRow
                  key={field.key}
                  field={field}
                  binding={cfg[field.key]}
                  listening={!closing && listening === field.key}
                  onCapture={capture}
                  onReset={reset}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
