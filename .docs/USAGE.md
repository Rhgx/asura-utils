# Usage guide

## Opening Asura Utils

Asura Utils adds two primary controls to Asura Scans:

| Control | Location | Purpose |
| --- | --- | --- |
| Reader handle | Right edge of a chapter page | Expands or collapses the reader dock |
| Settings button | Site header beside the profile control, and the reader dock header on chapter pages | Opens all Asura Utils settings |

Settings are split into sections in the window's sidebar: Reader, Site, Library, Appearance, Shortcuts, and Backup & Reset. Type in the search box at the top of the sidebar to list matching settings from every section, then select one to jump to it. Press `Esc` to clear the search. The gear in the reader dock opens the window on the Reader section.

## Reader dock

The dock groups the most common chapter-reading actions in one place:

- Start or stop auto-scroll and adjust its speed. Scrolling manually with the wheel, touch, or scroll keys pauses auto-scroll briefly, and it resumes about a second later.
- Set a fixed image width or toggle fit-width mode (comic chapters only).
- Reduce image brightness for night reading (comic chapters only).
- Navigate to the previous chapter, next chapter, series page, or page top.
- Move to the previous or next page (comic chapters only, see [Page navigation](#page-navigation)).
- Choose what happens when the end of a chapter is reached.
- Open settings with the gear in the dock header.

The dock starts collapsed by default. It can be disabled completely from **Settings → Reader**. **Hide Site Reader Controls** in the same section hides the site's own tap-to-show reader bars, which the dock replaces.

The dock also works on novel chapters. On those chapters the Layout section (width, fit width, and brightness) and the page counter and page buttons are hidden.

## Chapter-end actions

| Option | Behavior |
| --- | --- |
| Disabled | Takes no action at the chapter end |
| Next Chapter (Smart) | Opens the next accessible chapter and avoids detected premium locks |
| Series Page (Smart) | Returns to the current series page |
| Stop Auto Scroll | Stops scrolling at the chapter end |

**Next Chapter (Smart)** is the default. When the next chapter is premium-locked, a hint shows when it unlocks.

Once about 70 percent of a chapter has been read, the first pages of the next accessible chapter are preloaded so it opens faster.

If your Asura Scans account has premium access, enable **Account Has Premium** so navigation does not treat premium chapters as unavailable. This setting does not apply to novel chapters, which are locked with Shards.

## Keyboard shortcuts

| Default | Action | Alternate built-in keys |
| :---: | --- | --- |
| `S` | Toggle auto-scroll | Double-click the page |
| `E` | Increase scroll speed | `+`, Numpad `+` |
| `Q` | Decrease scroll speed | `-`, Numpad `-` |
| `D` | Next chapter | `→`, `Page Down`, `]` |
| `A` | Previous chapter | `←`, `Page Up`, `[` |
| `Z` | Previous page (comic chapters) | None |
| `X` | Next page (comic chapters) | None |
| `B` | Go to series page | — |
| `W` | Toggle fit width | — |
| `C` | Focus series search | — |
| `L` | Jump to the chapter list | — |

To rebind a shortcut, open **Settings → Shortcuts**, select its key field, and press the new key. Press `Backspace` or `Delete` while capturing a shortcut to clear it. Modifier-only keys and combinations using `Ctrl`, `Alt`, or the OS key are not accepted.

## Page navigation

Page navigation applies to comic chapters, where each page is a separate image.

- The dock header shows the current page and the total, such as `3 / 24`.
- **Prev Page** and **Next Page** in the dock's Navigation section, and the `Z` and `X` shortcuts, move between pages.
- Partway down a tall page, **Prev Page** first returns to the top of that page. Press it again to go to the page before.
- Hovering the progress bar shows the current page as a tooltip.
- At the first or last page, a short hint says so.

## Reading progress and history

With history tracking enabled, Asura Utils stores the last opened chapter and progress for each series.

- A **Continue Reading** action appears on supported series pages, including novel series pages.
- The current chapter is marked in chapter lists.
- Finished chapters appear dimmed.
- Reopening an unfinished chapter restores its saved position when position restoration is enabled. When the site has its own saved position for the chapter, the site restores it instead. On novel chapters, the site handles position restoration.
- The top progress bar shows the current chapter position and can be selected to jump within the page.

History is stored locally through Tampermonkey. Use **Settings → Library → Clear Reading History** to remove it.

## Novels

Novel chapters (`/novels/{series}/chapter/{number}`) support most reader features:

- The reader dock, auto-scroll, and progress bar work. Progress and chapter-end actions measure the novel text.
- Reading history records novel chapters. Continue Reading, read marks, and chapter list tools work on novel series pages.
- Novel chapters are locked with Shards. Asura Utils reads the lock state from the page, and **Account Has Premium** does not bypass it.
- The dock's Layout section, page counter, and page buttons are hidden, and the `Z` and `X` shortcuts are ignored.

## New chapter badges

With **New Chapter Badges** on (Library section, on by default), a series cover in your history shows a badge such as `3 new` when the page shows chapters newer than the last chapter you read. Only whole chapters are counted. The badge reads `New` when the only newer chapter is a fractional one, such as 10.5.

Badges need **Track Reading History** and are not shown in the reader. The count uses the latest chapter numbers shown for that series on the current page, so a page that does not list the newest chapter can show a smaller count.

## Chapter list tools

On a series page with a chapter list, a toolbar above the list offers two actions. It needs **Track Reading History**.

- **Next Unread: Ch. N** opens the lowest chapter above your highest read chapter. When nothing is left, the button reads **All Caught Up** and is disabled.
- **Mark Read Up To...** enters pick mode. Click a chapter to mark it and every earlier chapter as read. Press `Esc` to cancel. The read list is replaced, so picking an earlier chapter also marks later chapters as unread.

## Series filters

With **Series Filters** on (Library section, on by default), series covers on the home and browse pages show a hide button when you hover them. Click it to hide that series from those pages. Hidden series stay hidden until you unhide them.

The **Filters** group in **Settings → Library** lists hidden series with an **Unhide** button, and has an **Excluded Genres** checkbox for each genre seen so far. Checking a genre hides series with that genre, matched without regard to case. Genres are learned from series seen on the site, so a series is hidden by genre only after its genres have been seen.

## History manager

The **History** group in **Settings → Library** lists every series in your reading history, most recently read first. Each row shows:

- The series title, which links to the last chapter you read.
- The last chapter, your progress (or **Finished** at 90 percent or more), and how long ago you read it.
- The number of chapters marked as read, and a **Novel** tag for novel series.

Type in the search box to filter rows by title. **Remove** deletes one series from history.

Use **Export History** above the list to copy your history as JSON. **Import History** takes pasted JSON, either from an export or a bare history object, and merges it into your history. For a series that is in both, the entry with the newer last-read time supplies the title, last chapter, and progress, and the read chapters from both are combined. Invalid entries are skipped. If no entry is valid, nothing is imported.

## Appearance

Choose a preset from **Settings → Appearance**. Available presets are Asura Classic, Asura Ocean, Asura Midnight (true black), Asura Sapphire, Asura Crimson, Asura Ember, and Asura Sakura.

Enable **Custom Accent Color** to override the preset accent. Changes preview immediately and apply across supported site elements.

## Language

**Language** in **Settings → Appearance** sets the language of Asura Utils menus, the reader dock, and its messages. The options are:

- **Auto (browser language)**, the default. Uses the first browser language that Asura Utils supports, or English if none match.
- English, Türkçe, Español, Português (Brasil), and Bahasa Indonesia.

Changes apply straight away. Only Asura Utils' own text is translated, not the site.

## Importing and exporting settings

**Settings → Backup & Reset** provides three actions for your settings:

| Action | Result |
| --- | --- |
| Export Settings | Copies the current configuration as JSON |
| Import Settings | Applies configuration from pasted JSON |
| Reset to Defaults | Restores every setting to its shipped default |

Reading history has its own actions in **Settings → Library**, above the history list:

| Action | Result |
| --- | --- |
| Export History | Copies reading history as JSON |
| Import History | Merges pasted reading history JSON into your history |
| Clear Reading History | Removes all saved series and chapter progress |

Exported settings are useful for backups or moving configuration between browsers. Reading history is managed separately and is not included in the settings export. Use Export History and Import History to move it. Series filters are also stored separately and are not included in the settings export.

## Automatic updates

Install from the [latest GitHub release](https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js) to receive an update-enabled build. Tampermonkey periodically checks the release metadata and prompts or updates according to its configured update policy.

If updates are not detected, confirm that the installed script metadata contains both `@updateURL` and `@downloadURL`, then use Tampermonkey's manual update check.
