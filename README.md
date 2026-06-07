# copy-test-path

A browser extension for **Chrome** and **Firefox** that lets you copy the DOM selector path of any element for use in E2E tests — Playwright, Cypress, or raw CSS / XPath.

---

## Table of contents

- [Features](#features)
- [Install](#install)
- [How to use](#how-to-use)
  - [Right-click context menu](#right-click-context-menu)
  - [Element picker](#element-picker)
  - [Inspector mode](#inspector-mode)
  - [Copy all testids](#copy-all-testids)
  - [Settings tab](#settings-tab)
- [Output formats](#output-formats)
- [Settings and options](#settings-and-options)
- [History](#history)
- [HTML attributes for cleaner paths](#html-attributes-for-cleaner-paths)
- [Architecture](#architecture)
- [Development](#development)

---

## Features

| Feature | Description |
|---|---|
| **Right-click → Copy Path** | Copy any element's selector without touching DevTools |
| **Element picker** | Visual overlay — hover to preview, click to copy, ESC to cancel |
| **Inspector mode** | Floating tooltip follows your cursor; click any element to copy and exit |
| **4 output formats** | Playwright path, CSS selector, XPath, Playwright snippet |
| **Copy all testids** | Dump every `data-testid` on the page in one click |
| **Highlight on copy** | Brief gold outline flash on the copied element |
| **Shadow DOM traversal** | Walks across shadow root boundaries with `{shadow}` markers |
| **`data-testignore`** | Skip decorator / wrapper elements from paths |
| **`data-testlabel`** | Human-readable label shown alongside testids |
| **`data-test-context`** | Prefix paths with a page or section name |
| **Copy history** | Last 20 paths stored; re-copy any from the settings tab |
| **Dark mode** | Toggle in the settings tab; persists across sessions |

---

## Install

### Firefox

**Temporary (development)**
1. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on…**
2. Select `firefox/manifest.json`

**Permanent (unsigned)**
1. Set `xpinstall.signatures.required = false` in `about:config`
2. Drag `dist/copy-test-path-firefox.xpi` into Firefox, or double-click it

### Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chromium/` folder

---

## How to use

### Right-click context menu

Right-click **any element on any page** to get the copy-test-path submenu:

| Item | What it copies |
|---|---|
| **Copy Path** | Element's path in the currently selected format |
| **Copy URL + Path** | Full page URL followed by ` \| ` and the element path |
| **Pick element from page** | Opens the [element picker](#element-picker) overlay |
| **Copy All testids on Page** | Every `data-testid` value found on the page |
| **Toggle Inspector Mode** | Turns [inspector mode](#inspector-mode) on or off |

After copying, a brief toast ("Copied!") appears in the corner of the page and the element flashes gold.

---

### Element picker

The element picker is a full-page overlay that lets you visually select an element.

**To open it:**
- Right-click anywhere → **Pick element from page**, or
- Click the extension icon → **Pick element from page** (switches back to your tab automatically)

**How it works:**
1. The page dims with a spotlight cutout highlighting the element under your cursor
2. The path preview updates in real time in the floating dialog (bottom-right by default)
3. **Click any element** → path is copied to clipboard, a "Copied!" toast appears, and the picker closes
4. **"Copy path" button** in the dialog → same as clicking the element (useful when you want to copy what is already highlighted without moving the cursor)
5. **Drag the dialog** by its header to reposition it anywhere on screen
6. **ESC** → exit the picker without copying

The overlay is injected as a closed shadow DOM, so it is completely isolated from the page's styles and scripts.

---

### Inspector mode

Inspector mode turns on a persistent hover-to-copy overlay.

**To toggle it:**
- Right-click → **Toggle Inspector Mode**, or
- Click the extension icon → **Toggle Inspector Mode** (switches back to your tab automatically)

**How it works:**
1. A "Inspector — click to copy · click here to exit" badge appears in the top-right corner
2. A floating tooltip follows your cursor and shows the path of the element under it
3. **Click any element** → path is copied, element flashes gold, inspector turns off
4. **Click the badge** → exit inspector without copying
5. **ESC** → exit inspector without copying

---

### Copy all testids

Scans the entire page for elements with a `data-testid` attribute and copies them to the clipboard as a sorted list.

```
btn:sign-in
card:product (×3)
form:checkout
input:email
```

Duplicates are shown with a count (`×N`). Useful for auditing test coverage.

---

### Settings tab

Click the **extension icon** in the toolbar to open the settings tab. It opens in a new browser tab so you have full space.

The tab remembers which page you were on (shown as a green dot + URL in the Actions card). All action buttons (Pick element, Copy all, Toggle inspector) act on that source tab, then switch focus back to it automatically.

---

## Output formats

Select the default format in the settings tab or from the extension icon. The format applies to all copy operations — right-click, picker, inspector, and the `get-nav-path` action.

### Playwright path *(default)*

Walks up the DOM, using `data-testid` when available, otherwise `tagName[siblingIndex]`. Stops at `<body>` or after 25 steps (shows `...` if truncated).

```
section[1] > form[1] > btn:submit
```

If an element has both `data-testid` and `data-testlabel`:
```
card:product[data-testlabel="Winter Jacket"]
```

If an ancestor has `data-test-context="checkout"`:
```
checkout | section[1] > btn:submit
```

Shadow DOM boundaries are marked with `{shadow}`:
```
app-root > {shadow} > nav[1] > a[2]
```

---

### CSS selector

Uses `data-testid` attributes and element `id` values where present; falls back to `tagName:nth-of-type(n)`.

```
section:nth-of-type(1) > [data-testid="btn:submit"]
```

---

### XPath

Uses `data-testid` when available; falls back to `tagName[siblingIndex]`.

```
/section[1]/form[1]/*[@data-testid="btn:submit"]
```

---

### Playwright snippet

Generates a ready-to-paste Playwright statement. Uses `page.getByTestId()` if the element has a `data-testid`; otherwise `page.locator()` with the Playwright path.

Input / textarea / contenteditable elements get `.fill('')` appended. `<select>` elements get `.selectOption('')`.

```js
await page.getByTestId('btn:submit');
await page.locator('section[1] > form[1] > button[2]');
await page.getByTestId('input:email').fill('');
await page.locator('select[1]').selectOption('');
```

---

## Settings and options

Open the extension icon to access settings. Changes take effect immediately and are synced via `browser.storage.sync` (shared across devices signed into the same browser account).

| Setting | Default | Description |
|---|---|---|
| **Output format** | Playwright path | Which format to use for all copy operations |
| **Highlight on copy** | On | Flash a gold outline on the element after copying |
| **Traverse shadow DOM** | On | Walk across shadow root boundaries when building paths; inserts `{shadow}` markers |
| **Skip data-testignore** | On | Elements with the `data-testignore` attribute are skipped; the path uses the parent instead |

---

## History

The extension stores the **last 20 copied paths** in `browser.storage.local`.

The settings tab shows all history items, each with:
- A format badge (Playwright / CSS / XPath / Snippet)
- The full path text
- A relative timestamp (e.g. "3m ago")
- A **Copy** button to re-copy to the clipboard without revisiting the page

The history list updates live via BroadcastChannel whenever a path is copied in any tab.

Use **Clear all** in the settings tab to wipe the history.

---

## HTML attributes for cleaner paths

The extension works on any website without any setup. Adding these attributes to your own frontend produces shorter, more stable selector paths.

| Attribute | Where to put it | Effect |
|---|---|---|
| `data-testid="value"` | Interactive or key structural elements | Used as the segment instead of `tagName[n]`; stable across DOM refactors |
| `data-testlabel="value"` | Alongside `data-testid` on repeated elements | Appended to the path as `testid[data-testlabel="value"]` |
| `data-testignore` | Decorative wrappers, layout divs | Element is skipped and not included in the path |
| `data-test-context="value"` | Top-level sections or page roots | All paths rooted within this element get `value | ` prepended |

**Example:**

```html
<section data-test-context="checkout">
  <div data-testignore>          <!-- skipped -->
    <button data-testid="btn:place-order">Place order</button>
  </div>
</section>
```

Resulting Playwright path:
```
checkout | btn:place-order
```

Without the attributes the path would be something like:
```
section[2] > div[1] > button[3]
```

---

## Architecture

```
firefox/
├── manifest.json          # MV2 manifest (Firefox-specific)
├── background.js          # Context menus + opens settings tab on icon click
├── content.js             # Injected into every page; handles messages
├── page.html              # Settings tab (new tab, not popup)
├── page.js                # Settings tab logic
├── css/
│   └── theme.css          # Design tokens (light + dark)
├── js/
│   ├── broadcast.js       # BroadcastChannel — notifies settings tab on copy
│   ├── clipboard.js       # navigator.clipboard with textarea fallback
│   ├── highlight.js       # Gold outline flash on copied element
│   ├── history.js         # Stores last 20 paths in storage.local
│   ├── i18n.js            # data-i18n attribute renderer
│   ├── inspector.js       # Hover-to-copy overlay (shadow DOM)
│   ├── log.js             # Styled console.log helper
│   ├── picker.js          # Visual element picker (shadow DOM overlay + SVG spotlight)
│   ├── settings.js        # Loads + caches settings from storage.sync
│   └── toast.js           # Bottom-right toast notification
└── lib/
    └── path-builder.js    # Path generation for all 4 formats (symlink → lib/)

lib/
└── path-builder.js        # Canonical shared source for path logic

chromium/
├── manifest.json          # MV3 manifest (Chrome-specific)
├── background.js          # Service worker (Chrome)
├── content.js
├── popup.html             # Chrome uses a popup (not a new tab)
└── popup.js
```

### Message flow — right-click copy

```
User right-clicks element
  → content.js stores element reference (contextmenu event)
  → user selects menu item
  → background.js receives contextMenus.onClicked (has frameId)
  → background.js sends { action } to content.js in the correct frame
  → content.js builds path via formatPath()
  → content.js writes to clipboard (navigator.clipboard → textarea fallback)
  → content.js shows toast, flashes highlight, saves to history, broadcasts
```

### Message flow — extension icon

```
User clicks toolbar icon
  → background.js opens page.html?tab=<sourceTabId> in a new tab
  → page.js reads sourceTabId from URL params
  → action buttons send messages to sourceTabId
  → "Pick element" / "Toggle inspector" switch focus back to sourceTabId
```

### Picker and inspector — shadow DOM isolation

Both the element picker and inspector mode inject a **closed shadow DOM** directly into the page instead of an iframe. This avoids Firefox's transparency issues with extension iframes and ensures the overlay is fully isolated from the page's styles.

The `elFromPoint(x, y)` helper temporarily sets `display: none !important` on the shadow host so `document.elementFromPoint` sees through to real page elements, then restores it synchronously.

### Segment rules

| Condition | Segment produced |
|---|---|
| `data-testid="btn:login"` | `btn:login` |
| `data-testid="card"` + `data-testlabel="Pro"` | `card[data-testlabel="Pro"]` |
| 2nd `<div>` among its `<div>` siblings | `div[2]` |
| Element has `data-testignore` | Skipped; path uses parent |
| Shadow root boundary | `{shadow}` inserted before continuing |
| Path exceeds 25 steps | `...` prepended to indicate truncation |

### Chrome vs Firefox

| | Chrome (MV3) | Firefox (MV2) |
|---|---|---|
| Background | Service worker | Persistent background page |
| API namespace | `chrome.*` | `browser.*` (Promise-based) |
| Settings UI | Popup (`popup.html`) | New tab (`page.html?tab=<id>`) |
| Clipboard | Content script writes directly | Content script writes directly |
| Picker / inspector | Shadow DOM overlay | Shadow DOM overlay |
| Path-builder source | `lib/path-builder.js` (symlink) | `lib/path-builder.js` (symlink) |

---

## Development

### Run path-builder tests

```bash
node verify.js              # unit tests for all 4 path formats
node verify-any-site.js     # integration tests against live sites
```

### Build distributable packages

```bash
make                        # builds both .zip (Chrome) and .xpi (Firefox)
```

Output goes to `dist/`.

### Load in Firefox (development)

1. `about:debugging` → **This Firefox** → **Load Temporary Add-on…** → select `firefox/manifest.json`
2. Make edits, then click **Reload** in `about:debugging` to pick up changes
3. Background script changes require a full reload; content script changes take effect on next page load

### Load in Chrome (development)

1. `chrome://extensions` → **Developer mode** → **Load unpacked** → select `chromium/`
2. Click the refresh icon on the extension card after making changes
