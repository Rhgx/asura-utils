# Asura Utils (Vite + vite-plugin-monkey)

This project is migrated to `vite-plugin-monkey` and now builds userscript artifacts from `src/main.js`.

## Scripts

- `npm run dev`: Start Vite dev mode for userscript development.
- `npm run build`: Build production userscript artifacts.
- `npm run preview`: Start Vite preview server.
- `npm test`: Build and verify output artifacts/metadata.

## Build Artifacts

`npm run build` outputs:

- `dist/asura-utils.user.js`
- `dist/asura-utils.meta.js`

Use `asura-utils.user.js` to install the script in Tampermonkey.

## Userscript Metadata Source

Userscript metadata is configured in `vite.config.js` under the `monkey({ userscript: ... })` block.

## Versioning

Script version is sourced from `package.json` (`version`).

To release a new version:

1. Bump `version` in `package.json`.
2. Run `npm run build`.
3. Distribute `dist/asura-utils.user.js` (and `.meta.js` if used for update checks).

## Source Layout

- `src/main.js`: Bootstrap entry.
- `src/config/*`: Defaults and modal section config.
- `src/store/*`: Persistent config store.
- `src/theme/*`: Theme presets and application.
- `src/views/*`: Settings/progress/dock view classes.
- `src/controllers/*`: Reader/page controller logic.
- `src/styles/*`: Multi-file CSS imports.

Legacy monolith reference is kept at `reference/main.legacy.js`.
