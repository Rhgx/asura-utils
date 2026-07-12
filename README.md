# Asura Utils

A Tampermonkey userscript for asurascans.com. The script adds reader tools, reading history, themes, and cleanup options.

Current version: 1.0.0

## Features

### Reader tools

- Auto scroll with adjustable speed
- Image width control and fit-width mode
- Image brightness slider for night reading
- Previous, next, series, and top navigation buttons
- Reading progress bar at the top of chapter pages. Click the bar to jump to a position
- Chapter end action: open the next chapter, return to the series page, or stop auto scroll
- Premium lock detection. The script checks the next chapter before navigation and skips locked chapters

### Reading history

- The script remembers your last chapter and reading progress per series
- Series pages show a Continue Reading button with your chapter and progress
- Your current chapter gets a marker in chapter lists. Finished chapters appear dimmed
- Reopening an unfinished chapter restores your scroll position

### Themes

- 7 presets: Asura Classic, Asura Ocean, Tokyo Night, Rosé Pine Moon, Kanagawa Dragon, Gruvbox Material, Everforest Dark
- Custom accent color with live preview. Works with every preset, including the default
- Themes recolor the full site. A dynamic engine finds hardcoded site colors and remaps them to your theme

### Cleanup and layout

- Ad and promo banner blocking
- Hide the home slider, Toraka promos, comments, or popular sections
- Hide the site back-to-top button
- Compact sidebar
- Colored chapter timestamps

### Shortcuts

- Rebind every shortcut in the settings window
- Defaults: S auto scroll, Q and E speed, A and D chapters, B series page, W fit width, C search, L chapter list
- Double-click a chapter page to toggle auto scroll

### Settings

- Gear button in the site header opens the settings window
- Export your settings as JSON to the clipboard
- Import settings from a paste prompt
- Reset all settings to defaults
- Clear reading history

## Install

1. Install the Tampermonkey extension in your browser.
2. Build the script or take `dist/asura-utils.user.js` from a release.
3. Open the file in your browser. Tampermonkey shows an install prompt.
4. Visit asurascans.com.

## Usage

- Open a chapter page. A slim handle appears on the right edge. Click the handle to open the reader dock.
- Click the gear button next to the profile button in the header to open settings.
- Set a chapter end action in the Reader tab for hands-free reading.

## Privacy

Settings and reading history stay in Tampermonkey storage on your machine. The script sends no data anywhere.

## Build from source

Requires Node.js and pnpm.

```sh
pnpm install
pnpm build
```

Build output:

- `dist/asura-utils.user.js`: the installable script
- `dist/asura-utils.meta.js`: update metadata

Run `pnpm test` to typecheck, build, and verify the output.

## Release

1. Bump `version` in `package.json`.
2. Run `pnpm build`.
3. Distribute `dist/asura-utils.user.js`.

## Source layout

- `src/main.ts`: entry point
- `src/config/`: defaults, keybinds, settings sections
- `src/store/`: config and reading history storage
- `src/theme/`: theme presets and theme engine
- `src/controllers/`: page, reader, history, and cleanup logic
- `src/views/`: settings modal, reader dock, progress bar
- `src/styles/`: CSS and the dynamic color remap engine
