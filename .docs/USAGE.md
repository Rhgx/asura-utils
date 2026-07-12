# Usage guide

## Opening Asura Utils

Asura Utils adds two primary controls to Asura Scans:

| Control | Location | Purpose |
| --- | --- | --- |
| Reader handle | Right edge of a chapter page | Expands or collapses the reader dock |
| Settings button | Site header, beside the profile control | Opens all Asura Utils settings |

## Reader dock

The dock groups the most common chapter-reading actions in one place:

- Start or stop auto-scroll and adjust its speed.
- Set a fixed image width or toggle fit-width mode.
- Reduce image brightness for night reading.
- Navigate to the previous chapter, next chapter, series page, or page top.
- Choose what happens when the end of a chapter is reached.

The dock starts collapsed by default. It can be disabled completely from **Settings → Reader**.

## Chapter-end actions

| Option | Behavior |
| --- | --- |
| Disabled | Takes no action at the chapter end |
| Next Chapter (Smart) | Opens the next accessible chapter and avoids detected premium locks |
| Series Page (Smart) | Returns to the current series page |
| Stop Auto Scroll | Stops scrolling at the chapter end |

**Next Chapter (Smart)** is the default.

If your Asura Scans account has premium access, enable **Account Has Premium** so navigation does not treat premium chapters as unavailable.

## Keyboard shortcuts

| Default | Action | Alternate built-in keys |
| :---: | --- | --- |
| `S` | Toggle auto-scroll | Double-click the page |
| `E` | Increase scroll speed | `+`, Numpad `+` |
| `Q` | Decrease scroll speed | `-`, Numpad `-` |
| `D` | Next chapter | `→`, `Page Down`, `]` |
| `A` | Previous chapter | `←`, `Page Up`, `[` |
| `B` | Go to series page | — |
| `W` | Toggle fit width | — |
| `C` | Focus series search | — |
| `L` | Jump to the chapter list | — |

To rebind a shortcut, open **Settings → Shortcuts**, select its key field, and press the new key. Press `Backspace` or `Delete` while capturing a shortcut to clear it. Modifier-only keys and combinations using `Ctrl`, `Alt`, or the OS key are not accepted.

## Reading progress and history

With history tracking enabled, Asura Utils stores the last opened chapter and progress for each series.

- A **Continue Reading** action appears on supported series pages.
- The current chapter is marked in chapter lists.
- Finished chapters appear dimmed.
- Reopening an unfinished chapter restores its saved position when position restoration is enabled.
- The top progress bar shows the current chapter position and can be selected to jump within the page.

History is stored locally through Tampermonkey. Use **Settings → Data → Clear Reading History** to remove it.

## Appearance

Choose a preset from **Settings → Appearance**. Available presets are Asura Classic, Asura Ocean, Tokyo Night, Rosé Pine Moon, Kanagawa Dragon, Gruvbox Material, and Everforest Dark.

Enable **Custom Accent Color** to override the preset accent. Changes preview immediately and apply across supported site elements.

## Importing and exporting settings

The **Data** tab provides four maintenance actions:

| Action | Result |
| --- | --- |
| Export Settings | Copies the current configuration as JSON |
| Import Settings | Applies configuration from pasted JSON |
| Reset to Defaults | Restores every setting to its shipped default |
| Clear Reading History | Removes all saved series and chapter progress |

Exported settings are useful for backups or moving configuration between browsers. Reading history is managed separately and is not included in the settings export.

## Automatic updates

Install from the [latest GitHub release](https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js) to receive an update-enabled build. Tampermonkey periodically checks the release metadata and prompts or updates according to its configured update policy.

If updates are not detected, confirm that the installed script metadata contains both `@updateURL` and `@downloadURL`, then use Tampermonkey's manual update check.
