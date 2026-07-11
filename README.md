# Asura Utils (Vite + vite-plugin-monkey)

This project is migrated to `vite-plugin-monkey` and now builds userscript artifacts from `src/main.js`.

## Scripts

- `pnpm dev`: Start Vite dev mode for userscript development.
- `pnpm build`: Build production userscript artifacts.
- `pnpm preview`: Start Vite preview server.
- `pnpm test`: Build and verify output artifacts/metadata.

## Build Artifacts

`pnpm build` outputs:

- `dist/asura-utils.user.js`
- `dist/asura-utils.meta.js`

Use `asura-utils.user.js` to install the script in Tampermonkey.

## Userscript Metadata Source

Userscript metadata is configured in `vite.config.js` under the `monkey({ userscript: ... })` block.

## Versioning

Script version is sourced from `package.json` (`version`).

To release a new version:

1. Bump `version` in `package.json`.
2. Run `pnpm build`.
3. Distribute `dist/asura-utils.user.js` (and `.meta.js` if used for update checks).

## Source Layout

- `src/main.js`: Bootstrap entry.
- `src/config/*`: Defaults and modal section config.
- `src/store/*`: Persistent config store.
- `src/theme/*`: Theme presets and application.
- `src/views/*`: Settings/progress/dock view classes.
- `src/controllers/*`: Reader/page controller logic.
- `src/styles/*`: Multi-file CSS imports plus the dynamic purple-accent remap engine (`dynamic-color-remaps.js`) that themes hardcoded site colors when a non-default theme is active.
