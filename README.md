# <img src="docs/assets/logo.svg" alt="" width="36" height="36" align="absmiddle"> Asura Utils

[![Release](https://img.shields.io/github/v/release/Rhgx/asura-utils?label=release&color=8b3fd9)](https://github.com/Rhgx/asura-utils/releases/latest)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-8b3fd9.svg)](LICENSE)

A Tampermonkey userscript that makes reading on [Asura Scans](https://asurascans.com/) cleaner and more convenient.

**[Install the latest release](https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js)**

## Install

1. Install a userscript manager: <a href="https://www.tampermonkey.net/"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/third-party/tampermonkey-dark-theme.png"><img src="docs/assets/third-party/tampermonkey.png" alt="" width="16" height="16" align="absmiddle"></picture></a> [Tampermonkey](https://www.tampermonkey.net/), <a href="https://violentmonkey.github.io/"><img src="docs/assets/third-party/violentmonkey.png" alt="" width="16" height="16" align="absmiddle"></a> [Violentmonkey](https://violentmonkey.github.io/), or <a href="https://scriptcat.org/"><img src="docs/assets/third-party/scriptcat.png" alt="" width="16" height="16" align="absmiddle"></a> [ScriptCat](https://scriptcat.org/).
2. Open the [latest userscript](https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js) and approve the installation.
3. Visit [asurascans.com](https://asurascans.com/). Open a chapter and select the handle on the right edge to expand the reader dock.

Your userscript manager checks for new releases automatically. Asura Utils is developed and tested with Tampermonkey.

## Features

- A collapsible reader dock with auto-scroll, speed control, image width, and brightness, for comic and novel chapters.
- Chapter and page navigation, a smart next-chapter action that detects premium locks, and Next Unread and Mark Read Up To on chapter lists.
- A reading progress bar, per-series history with Continue Reading links, new chapter badges, and position restoration.
- Series and genre filters for the home and browse pages.
- Seven theme presets, a custom accent color, full-site color remapping, and five interface languages.
- Ad and promotion blocking, optional section hiding, a compact sidebar, and a layout overhaul.
- Rebindable keyboard shortcuts, plus double-click to toggle auto-scroll.
- Settings and reading-history export and import, with a searchable history manager.

## Documentation

- [Using Asura Utils](docs/usage.md): the reader dock, shortcuts, navigation, history, filters, and themes
- [Configuration](docs/configuration.md): every setting, with its default and valid range
- [Development](docs/development.md): building from source, scripts, and project layout
- [Releasing](docs/releasing.md): versioning, tagged releases, and automatic updates

## Privacy

Settings, reading history, and series filters stay in your userscript manager's storage on your device. Asura Utils does not send this data anywhere.

## Credits

Asura Scans, its name, logo, and site content are the property of their respective owners. The Asura Utils logo borrows the colors and shapes of the Asura Scans logo. This is an independent community project and is not affiliated with, sponsored by, or endorsed by Asura Scans.

The Tampermonkey, Violentmonkey, and ScriptCat logos belong to their respective projects. The settings window uses icons from <a href="https://lucide.dev"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/third-party/lucide-dark-theme.svg"><img src="docs/assets/third-party/lucide.svg" alt="" width="16" height="16" align="absmiddle"></picture></a> [Lucide](https://lucide.dev), licensed under the ISC License.

## License

Asura Utils is licensed under the [GNU General Public License v3.0 only](LICENSE).
