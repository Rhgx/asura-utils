# Development guide

## Requirements

| Tool | Version / expectation |
| --- | --- |
| Node.js | 26, matching the release workflow |
| pnpm | 12.15.0, declared by `packageManager` |
| Browser | A browser with Tampermonkey for installation testing |

## Setup

```sh
git clone https://github.com/Rhgx/asura-utils.git
cd asura-utils
pnpm install
```

Use `pnpm install --frozen-lockfile` when reproducing CI exactly.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the Vite userscript development server |
| `pnpm typecheck` | Runs TypeScript with `--noEmit` |
| `pnpm build` | Creates production userscript artifacts |
| `pnpm test:unit` | Runs the unit tests in `tests/` with Node's test runner through `tsx` |
| `pnpm test` | Typechecks, runs unit tests, builds, and runs artifact metadata checks |
| `pnpm preview` | Starts Vite's preview server |

Run `pnpm test` before committing a change intended for release.

## Build artifacts

The production build writes generated files to the ignored `dist/` directory.

| File | Purpose |
| --- | --- |
| `dist/asura-utils.user.js` | Complete installable Tampermonkey userscript |
| `dist/asura-utils.meta.js` | Lightweight metadata used for update checks |

The verification script checks that both artifacts exist and contain the expected userscript header, grants, license, site match, and automatic-update URLs.

Generated files remain ignored because GitHub Actions rebuilds them from the tagged source and uploads them as release assets.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Userscript entry point and application bootstrap |
| `src/config/` | Default settings, metadata, modal sections, and keybindings |
| `src/store/` | Persistent configuration, reading-history, and series-filter storage |
| `src/theme/` | Theme controller, base tokens, and preset loading |
| `src/theme/presets/` | JSON theme definitions discovered during the build |
| `src/controllers/` | Page detection, cleanup, reader, navigation, and history behavior |
| `src/views/` | Reader dock, progress bar, and settings UI |
| `src/i18n/` | Interface translations: the English source catalog, other locale catalogs, and language resolution |
| `src/styles/` | Component, responsive, theme-mapping, and site-overhaul CSS |
| `scripts/verify-build.ts` | Release artifact and metadata verification |
| `vite.config.ts` | Vite and `vite-plugin-monkey` build configuration |

## Adding a theme preset

1. Add a JSON file to `src/theme/presets/`.
2. Provide a unique label, numeric order, and token map matching the existing presets.
3. Run `pnpm test`.

Preset files are loaded with `import.meta.glob`, so no manual registry entry is required.

## Adding or updating a language

The English catalog in `src/i18n/en.ts` is the source for every message key. The other locale files (`tr.ts`, `es.ts`, `ptBR.ts`, `id.ts`) are typed against the English keys, so TypeScript reports any missing key.

1. Add or change keys in `src/i18n/en.ts` first. Keep each `{placeholder}` name the same in every locale.
2. Give every key a value in each locale file. An empty value falls back to English.
3. Count-based strings need a `.one` and an `.other` pair. Only those two forms are used, so a locale does not need other plural categories.
4. To add a locale, create `src/i18n/<locale>.ts`, then register it in `SUPPORTED_LOCALES` and `CATALOGS` in `src/i18n/index.ts`. Add its native name to `LANGUAGE_NAMES` in `src/config/modalSections.ts` so it appears in the language select.
5. Run `pnpm test:unit`. `tests/i18n.test.ts` checks that every locale has exactly the English keys and keeps every English placeholder.

## Changing userscript metadata

Edit the `userscript` block in `vite.config.ts`. Package-level fields such as `version`, `description`, author, and license are also reflected in generated metadata by the build tooling.

When changing update asset names or repository URLs, update `scripts/verify-build.ts` at the same time so CI validates the new values.

## Release workflow

`.github/workflows/release.yml` installs dependencies with pnpm, verifies that a pushed tag matches `package.json`, runs `pnpm test`, uploads the build artifact, and creates a GitHub release. See [Releasing](RELEASING.md) for the maintainer procedure.
