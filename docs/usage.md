# Using Asura Utils

Asura Utils adds two controls to Asura Scans:

| Control | Location | Purpose |
| --- | --- | --- |
| Reader handle | Right edge of a chapter page | Expands or collapses the reader dock |
| Settings button | Site header beside the profile control, and the reader dock header on chapter pages | Opens all Asura Utils settings |

The settings window has a sidebar with six sections: Reader, Site, Library, Appearance, Shortcuts, and Backup & Reset. To find a setting, type in the search box at the top of the sidebar. Matching settings from every section appear, and selecting one jumps to it. Press `Esc` to clear the search. The gear in the reader dock opens the window on the Reader section.

## Reader dock

The dock puts the most common reading actions in one place:

- Start or stop auto-scroll and adjust its speed. Scrolling manually with the wheel, touch, or scroll keys pauses auto-scroll, and it resumes about a second later.
- Set a fixed image width or toggle fit-width mode (comic chapters only).
- Reduce image brightness for night reading (comic chapters only).
- Go to the previous chapter, next chapter, series page, or top of the page.
- Move to the previous or next page (comic chapters only; see [Page navigation](#page-navigation)).
- Choose what happens at the end of a chapter.
- Open settings with the gear in the dock header.

The dock starts collapsed. You can turn it off completely in **Settings → Reader**. In the same section, **Hide Site Reader Controls** hides the site's own tap-to-show reader bars, which the dock replaces.

The dock also works on novel chapters. There, it hides the Layout section (width, fit width, and brightness), the page counter, and the page buttons.

## Chapter-end actions

| Option | Behavior |
| --- | --- |
| Disabled | Does nothing at the end of the chapter |
| Next Chapter (Smart) | Opens the next accessible chapter and skips detected premium locks |
| Series Page (Smart) | Returns to the series page |
| Stop Auto Scroll | Stops scrolling at the end of the chapter |

**Next Chapter (Smart)** is the default. If the next chapter is premium-locked, a hint shows when it unlocks.

Once you have read about 70 percent of a chapter, Asura Utils preloads the first pages of the next accessible chapter so it opens faster.

If your Asura Scans account has premium access, turn on **Account Has Premium** so navigation does not treat premium chapters as unavailable. This setting does not apply to novel chapters, which are locked with Shards.

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
| `B` | Go to series page | None |
| `W` | Toggle fit width | None |
| `C` | Focus series search | None |
| `L` | Jump to the chapter list | None |

To rebind a shortcut, open **Settings → Shortcuts**, select its key field, and press the new key. To clear a shortcut, press `Backspace` or `Delete` while it is capturing. Modifier keys on their own, and combinations with `Ctrl`, `Alt`, or the OS key, are not accepted.

## Page navigation

Page navigation applies to comic chapters, where each page is a separate image.

- The dock header shows the current page and the total, such as `3 / 24`.
- **Prev Page** and **Next Page** in the dock's Navigation section, and the `Z` and `X` shortcuts, move between pages.
- Partway down a tall page, **Prev Page** first returns to the top of that page. Press it again to go to the previous page.
- Hovering over the progress bar shows the current page in a tooltip.
- A short hint appears when you reach the first or last page.

## Reading progress and history

When history tracking is on, Asura Utils saves the last chapter you opened and your progress for each series.

- A **Continue Reading** action appears on supported series pages, including novel series pages.
- Chapter lists mark the current chapter.
- Finished chapters appear dimmed.
- When position restoration is on, reopening an unfinished chapter returns you to your saved position. If the site has its own saved position for the chapter, the site restores it instead. On novel chapters, the site always handles position restoration.
- The progress bar at the top shows your position in the chapter. Select it to jump within the page.

History is stored locally in Tampermonkey. To remove it, use **Settings → Library → Clear Reading History**.

## Novels

Novel chapters (`/novels/{series}/chapter/{number}`) support most reader features:

- The reader dock, auto-scroll, and progress bar work. Progress and chapter-end actions measure the novel text.
- Reading history records novel chapters. Continue Reading, read marks, and chapter list tools work on novel series pages.
- Novel chapters are locked with Shards. Asura Utils reads the lock state from the page, and **Account Has Premium** does not bypass it.
- The dock's Layout section, page counter, and page buttons are hidden, and the `Z` and `X` shortcuts do nothing.

## New chapter badges

When **New Chapter Badges** is on (Library section, on by default), series covers in your history show a badge such as `3 new` if the page lists chapters newer than the last one you read. Only whole chapters count. If the only newer chapter is a fractional one, such as 10.5, the badge reads `New`.

Badges need **Track Reading History** and do not appear in the reader. The count uses the latest chapter numbers the current page shows for that series, so a page that does not list the newest chapter can show a lower count.

## Chapter list tools

On a series page with a chapter list, a toolbar above the list offers two actions. Both need **Track Reading History**.

- **Next Unread: Ch. N** opens the lowest chapter above your highest read chapter. When none are left, the button reads **All Caught Up** and is disabled.
- **Mark Read Up To...** starts pick mode. Click a chapter to mark it and every earlier chapter as read, or press `Esc` to cancel. This replaces the read list, so picking an earlier chapter also marks later chapters as unread.

## Series filters

When **Series Filters** is on (Library section, on by default), hovering over a series cover on the home and browse pages shows a hide button. Click it to hide that series from those pages. Hidden series stay hidden until you unhide them.

The **Filters** group in **Settings → Library** lists hidden series, each with an **Unhide** button. It also has an **Excluded Genres** checkbox for each genre seen so far. Checking a genre hides every series with that genre; matching ignores case. Asura Utils learns genres from the series you see on the site, so it can only hide a series by genre after it has seen that series' genres.

## History manager

The **History** group in **Settings → Library** lists every series in your reading history, most recently read first. Each row shows:

- The series title, which links to the last chapter you read.
- The last chapter, your progress (or **Finished** at 90 percent or more), and how long ago you read it.
- The number of chapters marked as read, and a **Novel** tag for novel series.

Type in the search box to filter the list by title. **Remove** deletes a series from your history.

**Export History**, above the list, copies your history as JSON. **Import History** takes pasted JSON, either from an export or a bare history object, and merges it into your history. When a series appears in both, the entry read more recently supplies the title, last chapter, and progress, and the read chapters from both are combined. Invalid entries are skipped. If no entry is valid, nothing is imported.

## Appearance

Choose a theme preset in **Settings → Appearance**: Classic, Ocean, Midnight (true black), Sapphire, Crimson, Ember, or Sakura. The theme menu shows swatches of each preset's background, muted text, and accent colors.

Turn on **Custom Accent Color** to replace the preset's accent. Changes preview immediately and apply across supported site elements.

## Language

**Language** in **Settings → Appearance** sets the language of the Asura Utils menus, reader dock, and messages. The options are:

- **Auto (browser language)**, the default. It uses the first browser language Asura Utils supports, or English if none match.
- English, Türkçe, Español, Português (Brasil), and Bahasa Indonesia.

Changes apply immediately. Only Asura Utils' own text is translated, not the site.

## Importing and exporting settings

**Settings → Backup & Reset** has three actions for your settings:

| Action | Result |
| --- | --- |
| Export Settings | Copies the current configuration as JSON |
| Import Settings | Applies configuration from pasted JSON |
| Reset to Defaults | Restores every setting to its default |

Reading history has its own actions in **Settings → Library**, above the history list:

| Action | Result |
| --- | --- |
| Export History | Copies your reading history as JSON |
| Import History | Merges pasted reading history JSON into your history |
| Clear Reading History | Removes all saved series and chapter progress |

Exported settings are useful for backups or for moving your configuration to another browser. The settings export does not include reading history or series filters, which are stored separately. Use Export History and Import History to move your history.

## Automatic updates

Install from the [latest GitHub release](https://github.com/Rhgx/asura-utils/releases/latest/download/asura-utils.user.js) to get a build that updates itself. Tampermonkey periodically checks the release metadata and updates the script according to its own update settings.

If you installed a build from before automatic updates were added, install a current release once. If updates are still not detected, check that the installed script's metadata contains both `@updateURL` and `@downloadURL`, then run Tampermonkey's manual update check.
