# Asura Utils

[![Release](https://img.shields.io/github/v/release/Rhgx/asura-utils?label=release)](https://github.com/Rhgx/asura-utils/releases/latest)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

A Tampermonkey userscript that makes reading on [Asura Scans](https://asurascans.com/) cleaner and more convenient. It adds a reader dock, auto-scroll, reading history, themes, keyboard shortcuts, layout controls, and page cleanup.

## Install

### From a release

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open the [latest userscript](https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js).
3. Approve the installation in Tampermonkey.
4. Visit [asurascans.com](https://asurascans.com/).

Once a release build is installed, Tampermonkey can discover later releases automatically. See [Updates](#updates) for details.

### From source

```sh
pnpm install
pnpm build
```

Open `dist/asura-utils.user.js` in your browser and approve the Tampermonkey installation.

## Highlights

| Area | What it adds |
| --- | --- |
| Reader | Collapsible reader dock, auto-scroll, adjustable speed, image width and brightness controls |
| Navigation | Previous and next chapter controls, series navigation, chapter-end actions, premium-lock handling |
| Progress | Reading progress bar, per-series history, continue-reading links, and position restoration |
| Appearance | Seven theme presets, custom accent colors, and full-site color remapping |
| Cleanup | Ad and promotion blocking, optional section hiding, compact sidebar, and layout overhaul |
| Controls | Rebindable shortcuts plus double-click auto-scroll |
| Data | Settings export/import, reset controls, and local reading-history management |

## Default shortcuts

Shortcuts can be rebound or cleared from **Settings → Shortcuts**.

| Key | Action | Context |
| :---: | --- | --- |
| `S` | Toggle auto-scroll | Reader |
| `Q` / `E` | Decrease / increase scroll speed | Reader |
| `A` / `D` | Previous / next chapter | Reader |
| `B` | Return to the series page | Reader |
| `W` | Toggle fit-width mode | Reader |
| `C` | Focus search | Series page |
| `L` | Jump to the chapter list | Series page |

Auto-scroll can also be toggled by double-clicking a chapter page when that option is enabled.

## Quick start

1. Open a chapter page.
2. Select the slim handle on the right edge to expand the reader dock.
3. Adjust scrolling, image width, brightness, or navigation from the dock.
4. Select the gear button in the site header to configure appearance, reader behavior, layout, shortcuts, and saved data.

The default chapter-end action intelligently opens the next available chapter. It checks for premium locks before navigating.

## Themes

| Preset | Preset | Preset |
| --- | --- | --- |
| Asura Classic | Asura Ocean | Tokyo Night |
| Rosé Pine Moon | Kanagawa Dragon | Gruvbox Material |
| Everforest Dark |  |  |

Every preset supports an optional custom accent color with live preview.

## Updates

Release builds include Tampermonkey `@updateURL` and `@downloadURL` metadata. Tampermonkey checks the lightweight metadata asset from the latest GitHub release and installs the full userscript when it finds a newer version.

Users who installed a build from before automatic updates were introduced must install a current release once. Update frequency is controlled by Tampermonkey's own settings.

## Privacy

Settings and reading history remain in Tampermonkey storage on your device. Asura Utils does not send that data anywhere.

## Documentation

| Guide | Contents |
| --- | --- |
| [Documentation index](.docs/README.md) | Overview of all project guides |
| [Usage guide](.docs/USAGE.md) | Reader controls, shortcuts, history, themes, and data tools |
| [Configuration reference](.docs/CONFIGURATION.md) | Every setting, default value, and valid range |
| [Development guide](.docs/DEVELOPMENT.md) | Local setup, scripts, build artifacts, and source layout |
| [Release guide](.docs/RELEASING.md) | Versioning, tagged releases, CI, and automatic updates |

## Development

Requires Node.js 22 and `pnpm`.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Vite in userscript development mode |
| `pnpm typecheck` | Check TypeScript without emitting files |
| `pnpm build` | Build the userscript and metadata files into `dist/` |
| `pnpm test` | Typecheck, build, and verify both release artifacts |
| `pnpm preview` | Start the Vite preview server |

See the [development guide](.docs/DEVELOPMENT.md) for the complete project layout and workflow.

## License

Asura Utils is licensed under the [GNU General Public License v3.0 only](LICENSE).
