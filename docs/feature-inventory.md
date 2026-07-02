# Feature Inventory: copy-test-path

All features identified in the target codebase, ordered by dependency (topological).

---

## Feature: Path Building (4 formats)

**Tier:** Core
**Effort:** High
**Purpose:** Generate DOM selector paths in Playwright path, CSS selector, XPath, and Playwright snippet formats from any element.

**Triggers:** Called synchronously when any copy operation occurs. No async triggers.

**Inputs / Outputs:**
- Input: `Element` (a DOM element), `Settings` `{ format, shadowDom, skipTestignore, pathDepth }`
- Output: `string` — the formatted selector path

**Primary files:** `lib/path-builder.js`

**Dependencies:** None

**Edge cases & failure scenarios:**
- `data-testid` containing double quotes breaks CSS/XPath selector syntax
- Shadow root traversal detection via `getRootNode()` instanceof check
- 25-step hard limit on DOM walk-up
- `pathDepth` truncation with `…` ellipsis prefix
- `data-testignore` skips element but not its children
- `data-testlabel` only appended when `data-testid` present
- `<input>`, `<textarea>`, `[contenteditable]` get `.fill('')` in snippet; `<select>` gets `.selectOption('')`
- Empty page → `getAllTestIds` returns `{}`, `formatAllTestIds` returns "(no data-testid attributes found on this page)"

---

## Feature: Right-Click Context Menu

**Tier:** Core
**Effort:** Medium
**Purpose:** Register and handle browser context menu items for Copy Path, Copy URL + Path, Pick Element, Copy All testids, Toggle Inspector.

**Triggers:** Extension install/update (`onInstalled`), browser startup (`createContextMenus`).

**Inputs / Outputs:**
- Input: `contextMenus.onClicked` event with `{ menuItemId, frameId, tab }`
- Output: Sends message to content script via `tabs.sendMessage(tabId, { action }, { frameId })`

**Primary files:**
- `chromium/background.js`
- `firefox/background.js`

**Dependencies:** Path building (menu actions call formatPath), Manifest config (permissions), Content script (message handling)

**Edge cases & failure scenarios:**
- Iframe support via `frameId` — content script in correct frame receives message
- `chrome.runtime.lastError` silently suppressed on send failure
- Firefox includes "Pick element from page" in context menu; Chrome does not

---

## Feature: Content Script Message Handling

**Tier:** Core
**Effort:** Medium
**Purpose:** Receive actions from background script, execute copy/picker/inspector operations on the page.

**Triggers:** `runtime.onMessage` event from background script.

**Inputs / Outputs:**
- Input: `{ action: 'get-nav-path' | 'get-url-path' | 'get-all-testids' | 'toggle-inspector' }`
- Output: Clipboard write, toast, highlight, history save, broadcast, optional response

**Primary files:**
- `chromium/content.js`
- `firefox/content.js`

**Dependencies:** Path Building, Clipboard, Toast, Highlight, History, Broadcast, Logging

**Edge cases & failure scenarios:**
- `lastRightClicked` may be null if action fires without prior right-click
- Promise-based response in Firefox vs callback-based in Chrome
- `chrome.storage.onChanged` listener keeps settings in sync in Chrome; Firefox uses `CTP.settings.init()` + change listener

---

## Feature: Copy to Clipboard

**Tier:** Supporting
**Effort:** Low
**Purpose:** Write text to system clipboard with fallback mechanism.

**Triggers:** Any copy operation.

**Inputs / Outputs:**
- Input: `string` text to copy
- Output: Promise (resolves on success, rejects on failure)

**Primary files:**
- `chromium/content.js` (lines 68–89, inlined)
- `firefox/js/clipboard.js`

**Dependencies:** None

**Edge cases & failure scenarios:**
- `navigator.clipboard.writeText` may be undefined or reject
- Fallback: hidden textarea + `document.execCommand('copy')`
- No `<body>` available → immediate reject
- Firefox may block clipboard read in headless mode (noted in tests)

---

## Feature: Toast Notification

**Tier:** Supporting
**Effort:** Low
**Purpose:** Show a temporary "Copied!" or error message in the bottom-right corner.

**Triggers:** After any clipboard operation (success or failure).

**Inputs / Outputs:**
- Input: `string` message, `boolean` isError (changes background color)
- Output: DOM element injected, auto-removed after ~2.3s

**Primary files:**
- `chromium/content.js` (lines 112–119, inlined)
- `firefox/js/toast.js`

**Dependencies:** None

**Edge cases & failure scenarios:**
- No `<body>` → silently return

---

## Feature: Highlight on Copy

**Tier:** Supporting
**Effort:** Low
**Purpose:** Flash a gold outline and tint on the copied element for visual confirmation.

**Triggers:** After successful clipboard copy.

**Inputs / Outputs:**
- Input: `Element`
- Output: Element style mutated for 1200ms, then restored

**Primary files:**
- `chromium/content.js` (lines 91–110, inlined)
- `firefox/js/highlight.js`

**Dependencies:** Settings (respects `highlight` toggle)

**Edge cases & failure scenarios:**
- Previous highlight timer is cleared before applying new one
- Original styles restored exactly (outline, outlineOffset, background, transition)

---

## Feature: Settings Persistence

**Tier:** Supporting
**Effort:** Low
**Purpose:** Store and retrieve user preferences via `browser.storage.sync`.

**Triggers:** Extension startup, settings UI changes, `storage.onChanged` event.

**Inputs / Outputs:**
- Input: Key-value pairs from storage
- Output: In-memory settings object kept in sync

**Primary files:**
- `chromium/content.js` (lines 8–17, 61–65)
- `firefox/js/settings.js`
- `chromium/popup.js`
- `firefox/page.js`

**Dependencies:** None

**Edge cases & failure scenarios:**
- Default values merged with stored values (stored may have subset of keys)
- `storage.onChanged` listener updates in-memory cache reactively

---

## Feature: Inspector Mode

**Tier:** Core
**Effort:** Medium
**Purpose:** A persistent hover-to-copy mode with floating tooltip. Click any element to copy and exit.

**Triggers:** Context menu item or extension icon button toggles. ESC or clicking exit indicator.

**Inputs / Outputs:**
- Input: Mousemove events, click events, keydown (ESC)
- Output: Tooltip DOM element, clipboard write on click, highlight

**Primary files:**
- `chromium/content.js` (lines 130–196)
- `firefox/js/inspector.js`

**Dependencies:** Path building, Clipboard, Toast, Highlight, History, Broadcast, Logging

**Edge cases & failure scenarios:**
- Double-trigger prevention via `force` parameter
- Firefox uses closed shadow DOM for tooltip; Chrome uses direct DOM div
- Click on tooltip/indicator elements should not trigger copy

---

## Feature: Element Picker

**Tier:** Core
**Effort:** High
**Purpose:** Full-page overlay with spotlight cutout. Hover to preview path, click to copy. Includes draggable info dialog.

**Triggers:** Context menu item or extension icon → injects `picker.js` via `tabs.executeScript`.

**Inputs / Outputs:**
- Input: Mousemove events (30ms throttle), click events, drag events, ESC keydown
- Output: SVG overlay with spotlight cutout, clipboard write on click, toast

**Primary files:**
- `firefox/js/picker.js`
- `chrome/content.js` (delegates via executeScript — UNKNOWN if Chrome version has equivalent)

**Dependencies:** Path building, Clipboard, Toast, History, Broadcast

**Edge cases & failure scenarios:**
- Throttle: 30ms cooldown on mousemove
- Dialog drag bounds clamped to viewport
- `elFromPoint()` temporarily hides shadow host via `display:none !important` so `elementFromPoint` sees through it
- Guards against double-injection via `document.getElementById('ctp-picker-root')` check
- Auto-resize dialog width based on path length

---

## Feature: Copy All testids

**Tier:** Supporting
**Effort:** Low
**Purpose:** Scan the page for all `data-testid` attributes and copy as a sorted deduplicated list.

**Triggers:** Context menu item or extension icon button.

**Inputs / Outputs:**
- Input: None (scans `document.querySelectorAll('[data-testid]')`)
- Output: Sorted newline-separated string. Duplicates shown as `id (×N)`.

**Primary files:** `lib/path-builder.js` (lines 106–119), content scripts

**Dependencies:** None

**Edge cases & failure scenarios:**
- Empty page → `(no data-testid attributes found on this page)`
- Elements with empty `data-testid` attribute (value `""`) are excluded

---

## Feature: History

**Tier:** Supporting
**Effort:** Low
**Purpose:** Store last 20 copied paths in `storage.local` and display in settings UI.

**Triggers:** After every successful copy. History UI on settings page load and on BroadcastChannel message.

**Inputs / Outputs:**
- Input: `path` string, `format` string, `ts` timestamp
- Output: Array of `{ path, format, formatKey, ts }` objects in storage

**Primary files:**
- `firefox/js/history.js`
- `chromium/content.js` (history save inlined in action handlers)
- `chromium/popup.js` (lines 62–85, shows first 5 items)
- `firefox/page.js` (lines 89–138, shows all 20 items)

**Dependencies:** Settings (for format key)

**Edge cases & failure scenarios:**
- Max 20 items enforced by `data.history.length = 20`
- Re-copy button re-writes to clipboard via `navigator.clipboard.writeText`

---

## Feature: Cross-Tab Broadcast (BroadcastChannel)

**Tier:** Minor
**Effort:** Low
**Purpose:** Notify the settings tab (if open) when a path is copied in any tab, so history UI updates live.

**Triggers:** Every successful copy operation.

**Inputs / Outputs:**
- Input: `{ type: 'copied', path, format, ts }`
- Output: BroadcastChannel message received by settings page

**Primary files:**
- `firefox/js/broadcast.js`
- `chromium/content.js` (inlined)
- `chromium/popup.js` (listener)
- `firefox/page.js` (listener)

**Dependencies:** None

**Edge cases & failure scenarios:**
- BroadcastChannel('copy-test-path') shared across all tabs
- No effect if settings tab is closed

---

## Feature: Dark Mode

**Tier:** Minor
**Effort:** Low
**Purpose:** Toggle dark theme in settings UI, persisted via localStorage.

**Triggers:** User clicks dark mode toggle button.

**Inputs / Outputs:**
- Input: Click event
- Output: `localStorage.setItem('copy-test-path-theme')`, `:root.dark` class toggled

**Primary files:**
- `firefox/css/theme.css` (media query + `.dark` class)
- `firefox/page.js` (lines 64–72)
- `chromium/popup.js` (lines 51–60)

**Dependencies:** None

**Edge cases & failure scenarios:**
- Dark mode only applies to settings UI, not to picker/inspector overlays (those use hard-coded colors)
- System preference via `@media (prefers-color-scheme: dark)` also respected

---

## Feature: Path Depth Control

**Tier:** Supporting
**Effort:** Low
**Purpose:** Limit number of ancestor segments shown in path output.

**Triggers:** Setting change in Firefox settings UI.

**Inputs / Outputs:**
- Input: `pathDepth` value from settings (`'all'` or `'1'`–`'5'`)
- Output: Truncated path with `…` prefix

**Primary files:**
- `lib/path-builder.js` (lines 42–45)
- `firefox/page.html` (pathDepth dropdown)
- `firefox/page.js` (setting loader/binder)

**Dependencies:** Path building

**Edge cases & failure scenarios:**
- Only available in Firefox settings (Chrome popup missing this control)
- `parseInt` on `'all'` returns `NaN`, handled by `isNaN` check
- If path is shorter than depth limit, no truncation occurs

---

## Feature: Logging

**Tier:** Minor
**Effort:** Low
**Purpose:** Styled console.log output for debugging.

**Triggers:** Every copy operation.

**Inputs / Outputs:**
- Input: Label string, text string (truncated to 120 chars)
- Output: `console.log` with styled prefix

**Primary files:**
- `chromium/content.js` (lines 121–128)
- `firefox/js/log.js`

**Dependencies:** None

**Edge cases & failure scenarios:**
- Text truncated at 120 chars with `…` ellipsis when longer

---

## Feature: Internationalization (i18n)

**Tier:** Minor
**Effort:** Low
**Purpose:** Render localized strings via `data-i18n` attributes using `browser.i18n.getMessage()`.

**Triggers:** Settings page/UI load.

**Inputs / Outputs:**
- Input: `messages.json` with string keys
- Output: Text content replaced in DOM elements with `data-i18n` attributes

**Primary files:**
- `firefox/_locales/en/messages.json`
- `firefox/js/i18n.js`
- `chromium/popup.js` (imports i18n.js)
- `firefox/page.js` (imports i18n.js)

**Dependencies:** None (only English strings exist)

**Edge cases & failure scenarios:**
- Missing key → falls back to the key name itself
- Chrome popup imports `./js/i18n.js` but no such file exists in chromium/ — UNKNOWN if this actually works

---

## Feature: Cross-Browser Configuration (Manifests)

**Tier:** Supporting
**Effort:** Low
**Purpose:** Two separate manifest files for Chrome MV3 and Firefox MV2 with correct permissions and backgrounds.

**Triggers:** Extension load in browser.

**Inputs / Outputs:**
- Chrome: `manifest_version: 3`, service worker, `host_permissions: ["<all_urls>"]`, `clipboardWrite`, `contextMenus`, `activeTab`, `scripting`, `storage`
- Firefox: `manifest_version: 2`, persistent background, `<all_urls>` in permissions, `clipboardWrite`, `contextMenus`, `activeTab`, `storage`

**Primary files:**
- `chromium/manifest.json`
- `firefox/manifest.json`

**Dependencies:** None

**Edge cases & failure scenarios:**
- Firefox requires `browser_specific_settings.gecko.id` for unsigned add-ons
- Chrome MV3 doesn't support `tabs.executeScript` without `scripting` permission (chrome.scripting API)

---

## Feature: Package & Build

**Tier:** Minor
**Effort:** Low
**Purpose:** Build distributable .zip (Chrome) and .xpi (Firefox) packages.

**Triggers:** `make` command.

**Inputs / Outputs:**
- Input: `chromium/` and `firefox/` directories
- Output: `dist/copy-test-path-chrome.zip`, `dist/copy-test-path-firefox.xpi`

**Primary files:** `Makefile`

**Dependencies:** None

**Edge cases & failure scenarios:**
- `.gitkeep`, `.DS_Store`, `.git*` excluded from archives

---

## Feature: Unit Tests (Path Builder)

**Tier:** Supporting
**Effort:** Low
**Purpose:** Verify path builder correctness with Playwright against a known HTML fixture.

**Triggers:** `node verify.js`

**Inputs / Outputs:**
- 12 test cases covering: playwright path, shouldSkip, CSS selector, XPath, test snippet (with testid, button, no-id), getAllTestIds, shadow DOM traversal, nested shadow DOM, testContext, empty testids format, manifest version checks, file existence checks

**Primary files:** `verify.js`

**Dependencies:** Playwright

**Edge cases & failure scenarios:**
- File existence check references wrong files (firefox/popup.html, firefox/popup.js)

---

## Feature: Integration Tests (Live Sites)

**Tier:** Minor
**Effort:** Low
**Purpose:** Test extension against live sites (example.com, github.com, localhost:5175).

**Triggers:** `node verify-any-site.js`

**Inputs / Outputs:**
- Chrome: loads unpacked extension, navigates to live site, right-clicks, copies, verifies clipboard match
- Firefox: loads content script logic (no browser extension), evaluates path, writes to clipboard

**Primary files:** `verify-any-site.js`

**Dependencies:** Playwright

**Edge cases & failure scenarios:**
- Firefox clipboard read blocked in headless/restricted mode
- Test requires localhost:5175 server for regression tests
- Extension service worker may not be immediately available
