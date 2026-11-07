# Development

## Requirements

| Tool | Version / expectation |
| --- | --- |
| Node.js | 22, matching the release workflow |
| pnpm | 11.3.0, declared by `packageManager` |
| Browser | Any browser with Tampermonkey, for testing installs |

## Setup

```sh
git clone https://github.com/Rhgx/asura-utils.git
cd asura-utils
pnpm install
```

To reproduce CI exactly, use `pnpm install --frozen-lockfile`.

## Installing a local build

```sh
pnpm build
```

Open `dist/asura-utils.user.js` in your browser and approve the installation in Tampermonkey. A local build has the same update URLs as a release, so Tampermonkey can replace it with a newer release later.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts Vite in userscript development mode |
| `pnpm typecheck` | Runs TypeScript with `--noEmit` |
| `pnpm build` | Builds the userscript and metadata files into `dist/` |
| `pnpm test:unit` | Runs the unit tests in `tests/` with Node's test runner through `tsx` |
| `pnpm test` | Typechecks, runs the unit tests, builds, and verifies both artifacts |
| `pnpm preview` | Starts Vite's preview server |

Run `pnpm test` before committing a change meant for a release.

## Build artifacts

The production build writes its output to the `dist/` directory, which Git ignores.

| File | Purpose |
| --- | --- |
| `dist/asura-utils.user.js` | The complete userscript that Tampermonkey installs |
| `dist/asura-utils.meta.js` | A small metadata file used for update checks |

The verification script checks that both files exist and contain the expected userscript header, grants, license, site match, and update URLs.

These files are not committed, because GitHub Actions rebuilds them from the tagged source and uploads them as release assets.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Userscript entry point and application bootstrap |
| `src/config/` | Default settings, metadata, the settings layout (`settingsLayout.ts`), and keybindings |
| `src/store/` | Persistent configuration, reading-history, and series-filter storage |
| `src/theme/` | Theme controller, base tokens, and preset loading |
| `src/theme/presets/` | JSON theme definitions discovered during the build |
| `src/controllers/` | Page detection, cleanup, reader, navigation, and history behavior |
| `src/views/` | Reader Tools panel (`readerDockView.ts`), progress bar, and the settings window (see below) |
| `src/i18n/` | Interface translations: the English source catalog, other locale catalogs, and language resolution |
| `src/styles/` | Component, responsive, theme-mapping, and site-overhaul CSS |
| `scripts/verify-build.ts` | Release artifact and metadata verification |
| `docs/` | Project guides |
| `docs/assets/` | Project logo (`logo.svg`) and the PNG copy used as the userscript icon (`logo.png`) |
| `docs/assets/third-party/` | Logos of other projects shown in the README, with `-dark-theme` variants for GitHub's dark mode |
| `vite.config.ts` | Vite and `vite-plugin-monkey` build configuration |

### Settings window modules

`settingsModalView.ts` owns the window itself: opening, closing, section switching, and the keys that apply everywhere inside it. Each other part takes the `SettingsWindow` interface from `settingsWindow.ts` instead of reaching into the view.

| File | Responsibility |
| --- | --- |
| `settingsMarkup.ts` | The window's HTML, generated from `config/settingsLayout.ts` |
| `settingsControls.ts` | Toggles, number fields, selects, the theme menu, and dependencies between rows |
| `settingsSearch.ts` | Text matching, with no DOM use so it can be unit tested |
| `settingsSearchBox.ts` | The search box, its results, and the setting preview |
| `settingsShortcuts.ts` | The shortcut editor and key capture |
| `settingsLibrary.ts` | The history and filter lists |
| `settingsData.ts` | Export, import, reset, and clear |
| `settingsStatus.ts` | The status bar and its Undo |

### Page controller mixins

`PageController` combines one mixin per feature (such as `keyboardController.ts` and `readingHistoryController.ts`) that share `this`. The combined shape is declared in `controllers/types.ts`. Logic that needs no DOM lives in `*Logic.ts` or `config/` files, which is where the unit tests focus.

## Adding a theme preset

1. Add a JSON file to `src/theme/presets/`.
2. Provide a unique label, numeric order, and token map matching the existing presets.
3. Run `pnpm test`.

The build loads preset files with `import.meta.glob`, so you do not need to register them anywhere.

## Adding or updating a language

The English catalog in `src/i18n/en.ts` defines every message key. The other locale files (`tr.ts`, `es.ts`, `ptBR.ts`, `id.ts`) are typed against the English keys, so TypeScript reports any missing key.

1. Add or change keys in `src/i18n/en.ts` first. Keep each `{placeholder}` name the same in every locale.
2. Give every key a value in each locale file. An empty value falls back to English.
3. Strings that depend on a count need a `.one` and an `.other` form. Only those two forms are used, so a locale does not need other plural categories.
4. To add a locale, create `src/i18n/<locale>.ts`, then register it in `SUPPORTED_LOCALES` and `CATALOGS` in `src/i18n/index.ts`. Add its native name to `LANGUAGE_NAMES` in `src/config/settingsLayout.ts` so it appears in the language select.
5. Run `pnpm test:unit`. `tests/i18n.test.ts` checks that every locale has exactly the English keys and keeps every English placeholder.

## Changing userscript metadata

Edit the `userscript` block in `vite.config.ts`. Grants are listed explicitly there, so a new `GM_*` call needs an entry in `grant`, a declaration in `src/types/userscript.d.ts`, and a check in `scripts/verify-build.ts`. The build also copies package fields such as `version`, `description`, author, and license into the generated metadata. The `icon` URL points to `docs/assets/logo.png` on the `main` branch.

If you change the update asset names or repository URLs, update `scripts/verify-build.ts` at the same time so CI checks the new values.

## Release workflow

`.github/workflows/release.yml` installs dependencies with pnpm, checks that the pushed tag matches `package.json`, runs `pnpm test`, uploads the build, and creates a GitHub release. See [Releasing](releasing.md) for the full procedure.
