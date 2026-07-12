# Configuration reference

Open the gear button in the Asura Scans header to change these options. Settings are saved immediately in Tampermonkey storage.

## General

| Setting | Default | Description |
| --- | :---: | --- |
| Ad Blocker | On | Hides common ad containers and promotional close buttons |
| Colored Chapter Timestamps | On | Adds visual color treatment to chapter timestamps |
| Hide Home Slider | Off | Removes the large featured slider from the home page |
| Hide Toraka Promo | On | Hides detected Toraka promotion sections |
| Hide Comments Section | Off | Hides comment-related sections on supported pages |
| Hide Default Back-to-Top | On | Removes the site's own back-to-top control |

## Appearance

| Setting | Default | Values | Description |
| --- | --- | --- | --- |
| Theme | Asura Classic | Seven bundled presets | Selects the full-site color preset |
| Custom Accent Color | Off | On / Off | Enables the custom accent override |
| Accent Color | `#913fe2` | Browser color value | Sets the override color when enabled |

## Reader

| Setting | Default | Range / values | Description |
| --- | --- | --- | --- |
| Enable Reader Dock | On | On / Off | Shows the collapsible chapter reader controls |
| Show Progress Bar | On | On / Off | Shows reading progress at the top of chapter pages |
| Fit Width to Screen | Off | On / Off | Fits reader images to the available viewport width |
| Double-Click to Scroll | On | On / Off | Lets a page double-click toggle auto-scroll |
| Track Reading History | On | On / Off | Saves the latest chapter and progress for each series |
| Resume Chapter Position | On | On / Off | Restores saved progress when reopening a chapter |
| Account Has Premium | Off | On / Off | Allows smart navigation to consider premium chapters accessible |
| Chapter End Action | Next Chapter (Smart) | Disabled, next chapter, series page, stop scroll | Controls behavior at the end of a chapter |
| Image Width | `800 px` | `400–3000 px` | Sets the fixed reader image width |
| Scroll Speed | `2.0` | `0.1–15.0` | Sets the automatic scrolling speed |
| Image Brightness | `100%` | `40–100%`, steps of 5 | Dims reader images without changing the page theme |

## Layout

| Setting | Default | Description |
| --- | :---: | --- |
| Compact Sidebar | Off | Reduces the width used by right-side layout blocks |
| Hide Popular Section | Off | Hides detected popular or recommended sections |
| Overhaul Main Menu + Series Page | Off | Applies the alternate header and series-page layout |

## Shortcuts

All shortcut defaults and alternate keys are listed in the [usage guide](USAGE.md#keyboard-shortcuts). Bindings use physical keyboard codes, so letter shortcuts stay in the same physical position across keyboard layouts.

## Data storage

Configuration and reading history use Tampermonkey's local userscript storage through `GM_getValue` and `GM_setValue`. Asura Utils does not require an account, remote database, or external synchronization service.

Resetting settings does not clear reading history. Clearing reading history does not reset settings.
