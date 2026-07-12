# Releasing Asura Utils

Releases are built by GitHub Actions from tags whose names start with `v`.

1. Update the version in `package.json`.
2. Run `pnpm test` locally.
3. Commit the version change.
4. Create and push a matching tag, for example:

   ```sh
   git tag v1.0.0
   git push origin v1.0.0
   ```

The release workflow verifies that the tag matches the version in
`package.json`, runs the test and build checks, and creates a GitHub release
containing:

- `asura-utils.user.js`
- `asura-utils.meta.js`

The workflow can also be run manually to verify and download a build artifact.
Manual runs do not create a GitHub release.

## Automatic updates

The built userscript tells Tampermonkey to check the metadata file attached to
the latest GitHub release. When its `@version` is newer than the installed
version, Tampermonkey downloads the matching full userscript release asset.

Anyone who installed a build from before automatic updates were added must
install a current release once. Later tagged releases will then be discovered
automatically according to their Tampermonkey update-check settings.
