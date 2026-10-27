# Releasing Asura Utils

GitHub Actions builds and publishes releases from tags beginning with `v`. The tag version must exactly match the version in `package.json` after removing the leading `v`.

## Release checklist

| Step | Check |
| :---: | --- |
| 1 | Decide the next semantic version |
| 2 | Update `version` in `package.json` |
| 3 | Update release-facing documentation when behavior changed |
| 4 | Run `pnpm test` locally |
| 5 | Commit and push the release changes |
| 6 | Create and push the matching tag |
| 7 | Confirm the GitHub Actions run and both release assets |

## Versioning

Use semantic versions in `major.minor.patch` form:

| Change | Increment | Example |
| --- | --- | --- |
| Backward-compatible fix | Patch | `1.0.0` → `1.0.1` |
| Backward-compatible feature | Minor | `1.0.1` → `1.1.0` |
| Breaking behavior or configuration change | Major | `1.1.0` → `2.0.0` |

Tampermonkey compares the generated `@version` value when checking for updates. Always increase the version for a public update; republishing different code under the same version will not reliably update existing installations.

## Create the release

After the release commit is on `main`, create an annotated matching tag:

```sh
git tag -a v1.0.1 -m "Asura Utils v1.0.1"
git push origin v1.0.1
```

Do not reuse or move a published version tag. If a release needs correction, publish a new patch version.

## What CI verifies

The `Release build` workflow performs these steps:

1. Checks out the tagged commit.
2. Installs pnpm and Node.js 26.
3. Installs dependencies with `pnpm install --frozen-lockfile`.
4. Compares the tag with `package.json`.
5. Runs `pnpm test`.
6. Uploads the generated files as a workflow artifact.
7. Creates a GitHub release and attaches both userscript assets.

| Release asset | Role |
| --- | --- |
| `asura-utils.user.js` | Full script installed and executed by Tampermonkey |
| `asura-utils.meta.js` | Small metadata file checked for newer versions |

The workflow can also be started manually. Manual runs perform the build and upload a workflow artifact, but do not create a GitHub release.

## Automatic-update flow

```text
Tampermonkey checks latest asura-utils.meta.js
                    ↓
       compares installed @version
                    ↓
     newer version available?
          ├─ no  → no change
          └─ yes → download asura-utils.user.js
```

Both URLs use GitHub's stable latest-release asset path:

```text
https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.meta.js
https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js
```

Anyone who installed a build from before these metadata fields were added must install a current release once. Later releases are discovered according to their Tampermonkey update-check settings.

## Post-release checks

After the workflow succeeds:

1. Open the GitHub release and confirm it is neither a draft nor a prerelease.
2. Confirm both assets are attached.
3. Open the `asura-utils.meta.js` asset and verify the expected `@version`, `@updateURL`, and `@downloadURL`.
4. Install the `asura-utils.user.js` asset in Tampermonkey when the release changes installation or metadata behavior.

If the workflow fails, fix the underlying source or configuration, increment to a new version if the failed release was already published, and push a new tag.
