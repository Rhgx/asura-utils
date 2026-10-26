# Configuration reference

Open the gear button in the Asura Scans header to change these options. Settings are saved immediately in Tampermonkey storage.

The settings window lists its sections in a sidebar: Reader, Site, Library, Appearance, and Shortcuts, with Backup & Reset pinned at the bottom. Typing in the search box at the top of the sidebar replaces the section list with matching settings from every section, each labeled with its section. Matches on a setting's name come before matches found only in its description. Select a result, or move through the results with the arrow keys and press `Enter`, to open its section and highlight the setting. Press `Esc` or the clear button to return to the section list. The gear in the reader dock opens the window on the Reader section. On narrow screens the sidebar becomes a strip above the settings.

## Reader

| Group | Setting | Default | Range / values | Description |
| --- | --- | --- | --- | --- |
| Images | Fit Width to Screen | Off | On / Off | Fits reader images to the available viewport width |
| Images | Image Width | `800 px` | `400–3000 px` | Sets the fixed reader image width. Disabled while Fit Width to Screen is on |
| Images | Image Brightness | `100%` | `40–100%`, steps of 5 | Dims reader images without changing the page theme |
| Reader Tools | Enable Reader Dock | On | On / Off | Shows the collapsible chapter reader controls |
| Reader Tools | Hide Site Reader Controls | Off | On / Off | Hides the site's tap-to-show bars and hint on chapter pages, since the dock replaces them |
| Reader Tools | Show Progress Bar | On | On / Off | Shows reading progress at the top of chapter pages |
| Auto Scroll | Scroll Speed | `2.0` | `0.1–15.0` | Sets the automatic scrolling speed |
| Auto Scroll | Double-Click to Scroll | On | On / Off | Lets a page double-click toggle auto-scroll |
| Chapter End | Chapter End Action | Next Chapter (Smart) | Disabled, next chapter, series page, stop scroll | Controls behavior at the end of a chapter |
| Chapter End | Account Has Premium | Off | On / Off | Allows smart navigation to consider premium chapters accessible |

## Site

### Hide on Site

These options are shown as a two-column checklist. Hover the `?` beside an option to see its description.

| Setting | Default | Description |
| --- | :---: | --- |
| Ad Blocker | On | Hides common ad containers, Asura+ subscription banners, and promotional close buttons |
| Hide Home Slider | Off | Removes the large featured slider from the home page |
| Hide Toraka Promo | On | Hides detected Toraka promotion sections |
| Hide Popular Section | Off | Hides detected popular or recommended sections |
| Hide Announcements | Off | Hides the Announcements block on the home pages |
| Hide Novel Promos | Off | Hides the Trending Novels row and Read the Novel links on comic pages |
| Hide Comments Section | Off | Hides comment-related sections on supported pages |
| Hide Reactions | Off | Hides the emoji reactions block above comments |
| Hide Default Back-to-Top | On | Removes the site's own back-to-top control |

### Enhancements

| Setting | Default | Description |
| --- | :---: | --- |
| Colored Chapter Timestamps | On | Varies timestamp color and weight by recency so newer updates stand out |
| Compact Sidebar | Off | Reduces the width used by right-side layout blocks |
| Overhaul Main Menu + Series Page | Off | Applies the alternate header and series-page layout |

### Timestamp recency levels

When **Colored Chapter Timestamps** is enabled, only the timestamp's text color
and font weight change. No badge, background, border, or layout styling is
added.

| Timestamp age | Emphasis |
| --- | --- |
| Up to 6 hours | Brightest theme accent and boldest weight |
| 6–24 hours | Strong accent blend and semibold weight |
| 1–7 days | Muted accent blend and semibold weight |
| Older than 7 days | Dim theme text and regular weight |

## Library

### History

| Setting | Default | Description |
| --- | :---: | --- |
| Track Reading History | On | Saves the latest chapter and progress for each series |
| Resume Chapter Position | On | Restores saved progress when reopening a chapter. Disabled while Track Reading History is off |
| New Chapter Badges | On | Shows a `N new` badge on series covers in your history when the page shows newer chapters. Disabled while Track Reading History is off |

Below the settings are **Export History**, **Import History**, and **Clear Reading History**, followed by the history list: saved series, most recently read first, with a search box and a **Remove** button for each series. The history keeps the 150 most recently read series, and up to 600 read chapters per series.

### Filters

| Setting | Default | Description |
| --- | :---: | --- |
| Series Filters | On | Adds a hide button to series covers on the home and browse pages, and applies the rules listed below it |

The rules apply only while Series Filters is on.

| List | Contents |
| --- | --- |
| Hidden Series | Series hidden from a cover, each with an **Unhide** button |
| Excluded Genres | A checkbox for each genre seen on the site. Checked genres hide series with that genre |

Genres are learned from series seen on the site, so a series is hidden by genre only after its genres have been seen. Genre matching ignores case. The learned genre cache keeps up to 3000 series, and the genre name list keeps up to 300 names.

## Appearance

| Group | Setting | Default | Values | Description |
| --- | --- | --- | --- | --- |
| Theme | Theme | Asura Classic | Seven bundled presets | Selects the full-site color preset |
| Theme | Custom Accent Color | Off | On / Off | Enables the custom accent override |
| Theme | Accent Color | `#913fe2` | Browser color value | Sets the override color. Disabled while Custom Accent Color is off |
| Language | Language | Auto | Auto, English, Türkçe, Español, Português (Brasil), Bahasa Indonesia | Language for Asura Utils menus and messages. Auto follows the browser language |

## Shortcuts

All shortcut defaults and alternate keys are listed in the [usage guide](USAGE.md#keyboard-shortcuts). Bindings use physical keyboard codes, so letter shortcuts stay in the same physical position across keyboard layouts.

## Backup & Reset

| Action | Result |
| --- | --- |
| Export Settings | Copies the current configuration as JSON |
| Import Settings | Applies configuration from pasted JSON |
| Reset to Defaults | Restores every setting to its shipped default |

Reading history has its own export, import, and clear actions under **Library → History**.

## Data storage

Configuration, reading history, and series filters use Tampermonkey's local userscript storage through `GM_getValue` and `GM_setValue`. Series filters keep hidden series, excluded genres, and the learned genre cache in their own values. Asura Utils does not require an account, remote database, or external synchronization service.

Resetting settings does not clear reading history or series filters. Clearing reading history does not reset settings or series filters. Exported settings do not include reading history or series filters.
