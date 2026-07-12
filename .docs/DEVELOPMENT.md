# Development guide

## Requirements

| Tool | Version / expectation |
| --- | --- |
| Node.js | 22, matching the release workflow |
| pnpm | 11.3.0, declared by `packageManager` |
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
| `pnpm test` | Typechecks, builds, and runs artifact metadata checks |
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
| `src/store/` | Persistent configuration and reading-history storage |
| `src/theme/` | Theme controller, base tokens, and preset loading |
| `src/theme/presets/` | JSON theme definitions discovered during the build |
| `src/controllers/` | Page detection, cleanup, reader, navigation, and history behavior |
| `src/views/` | Reader dock, progress bar, and settings UI |
| `src/styles/` | Component, responsive, theme-mapping, and site-overhaul CSS |
| `scripts/verify-build.ts` | Release artifact and metadata verification |
| `vite.config.ts` | Vite and `vite-plugin-monkey` build configuration |

## Adding a theme preset

1. Add a JSON file to `src/theme/presets/`.
2. Provide a unique label, numeric order, and token map matching the existing presets.
3. Run `pnpm test`.

Preset files are loaded with `import.meta.glob`, so no manual registry entry is required.

## Changing userscript metadata

Edit the `userscript` block in `vite.config.ts`. Package-level fields such as `version`, `description`, author, and license are also reflected in generated metadata by the build tooling.

When changing update asset names or repository URLs, update `scripts/verify-build.ts` at the same time so CI validates the new values.

## Release workflow

`.github/workflows/release.yml` installs dependencies with pnpm, verifies that a pushed tag matches `package.json`, runs `pnpm test`, uploads the build artifact, and creates a GitHub release. See [Releasing](RELEASING.md) for the maintainer procedure.
