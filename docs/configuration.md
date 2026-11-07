# Configuration

Select the gear button in the Asura Scans header to change these options. Settings are saved to Tampermonkey storage immediately.

The settings window lists its sections in a sidebar: Reader, Site, Library, Appearance, and Shortcuts, with Backup & Reset pinned at the bottom. Typing in the search box at the top of the sidebar replaces the section list with matching settings from every section, each labeled with its section. Settings whose name matches come before settings that match only in their description. The highlighted result's setting is shown and marked. To go to a setting and focus its control, select the result, or move through the results with the arrow keys and press `Enter`. Press `Esc` or the clear button to return to the section list and the section you were on. The gear in Reader Tools opens the window on the Reader section. On phones, the window fills the screen and the sections appear as a grid above the settings.

## Reader

| Group | Setting | Default | Range / values | Description |
| --- | --- | --- | --- | --- |
| Images | Fit Width to Screen | Off | On / Off | Fits reader images to the width of the viewport |
| Images | Image Width | `800 px` | `400–3000 px` | Sets the fixed reader image width. Disabled while Fit Width to Screen is on |
| Images | Image Brightness | `100%` | `40–100%`, steps of 5 | Dims reader images without changing the page theme |
| Reader Tools | Enable Reader Tools | On | On / Off | Shows the collapsible chapter reader controls |
| Reader Tools | Hide Site Reader Controls | Off | On / Off | Hides the site's tap-to-show bars and hint on chapter pages, which Reader Tools replaces |
| Reader Tools | Show Progress Bar | On | On / Off | Shows reading progress at the top of chapter pages |
| Auto Scroll | Scroll Speed | `2.0` | `0.1–15.0` | Sets the automatic scrolling speed |
| Auto Scroll | Double-Click to Scroll | On | On / Off | Toggles auto-scroll when you double-click the page |
| Chapter End | Chapter End Action | Next Chapter (Smart) | Disabled, next chapter, series page, stop scroll | Sets what happens at the end of a chapter |
| Chapter End | Account Has Premium | Off | On / Off | Lets smart navigation treat premium chapters as accessible |

## Site

### Hide on Site

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

When **Colored Chapter Timestamps** is on, only the timestamp's text color and font weight change. It adds no badge, background, border, or layout styling.

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

### Filters

| Setting | Default | Description |
| --- | :---: | --- |
| Series Filters | On | Adds a hide button to series covers on the home and browse pages, and applies the rules listed below it |

The rules apply only while Series Filters is on.

| List | Contents |
| --- | --- |
| Hidden Series | Series hidden from a cover, each with an **Unhide** button |
| Excluded Genres | A checkbox for each genre seen on the site. Checked genres hide series with that genre |

Asura Utils learns genres from the series you see on the site, so it can only hide a series by genre after it has seen that series' genres. Genre matching ignores case. The learned genre cache keeps up to 3000 series, and the genre name list keeps up to 300 names.

### Reading History

The last group is the history list: your saved series, most recently read first, with a search box and a **Remove** button for each series. History keeps the 150 most recently read series and up to 600 read chapters per series.

## Appearance

| Group | Setting | Default | Values | Description |
| --- | --- | --- | --- | --- |
| Theme | Theme | Classic | Seven bundled presets, each shown with color swatches | Selects the full-site color preset |
| Theme | Custom Accent Color | Off | On / Off | Enables the custom accent override |
| Theme | Accent Color | `#913fe2` | Browser color value | Sets the override color. Disabled while Custom Accent Color is off |
| Language | Language | Auto | Auto, English, Türkçe, Español, Português (Brasil), Bahasa Indonesia | Sets the language of Asura Utils menus and messages. Auto follows the browser language |

## Shortcuts

The [usage guide](usage.md#keyboard-shortcuts) lists every default shortcut and alternate key. Bindings use physical key codes, so letter shortcuts stay in the same place on every keyboard layout.

## Backup & Reset

| Action | Result |
| --- | --- |
| Export Settings | Copies the current configuration as JSON |
| Import Settings | Applies configuration from pasted JSON |
| Reset to Defaults | Restores every setting to its default |
| Export History | Copies your reading history as JSON |
| Import History | Merges pasted reading history JSON into your history |
| Clear Reading History | Removes all saved series and chapter progress |

Importing opens a panel in the window that explains any mistake and keeps your paste. Importing settings, resetting them, and clearing history can each be undone from the bar at the bottom of the window. The offer lasts until you close the window, and for settings, until you change another setting.

## Data storage

Configuration, reading history, and series filters are saved in Tampermonkey's local userscript storage through `GM_getValue` and `GM_setValue`. Series filters store hidden series, excluded genres, and the learned genre cache in their own values. Asura Utils does not need an account, a remote database, or a sync service.

Resetting settings does not clear reading history or series filters. Clearing reading history does not reset settings or series filters. Exported settings do not include reading history or series filters.
