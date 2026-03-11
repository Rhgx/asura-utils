# Theme Presets

Each `*.json` file in this folder defines one selectable theme.

Schema:

```json
{
  "label": "Human Name",
  "order": 0,
  "tokens": {
    "--au-accent": "#913fe2"
  }
}
```

Notes:
- File name (without `.json`) is the preset key stored in config (example: `asuraClassic`).
- `order` controls display order in the theme dropdown.
- `tokens` only needs to include overrides; base tokens come from `src/theme/baseThemeTokens.json`.
