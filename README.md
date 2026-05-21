# UI Path Copy

A browser extension for Chrome and Firefox. Right-click any element to copy its DOM path for E2E tests — Playwright, Cypress, or raw CSS/XPath selectors.

---

## Features

| Feature | Description |
|---|---|
| **Right-click → Copy** | Right-click any element, copy its path in your preferred format |
| **Multiple formats** | Playwright path, CSS selector, XPath, or ready-to-paste Playwright snippet |
| **Inspector mode** | Hover to see paths live, click to copy (toggle from popup or context menu) |
| **Copy all testids** | One-click dump every `data-testid` on the page |
| **Highlight on copy** | Brief gold flash on the copied element |
| **Shadow DOM** | Traverses open shadow roots |
| **`data-testignore`** | Skip noisy wrapper elements |
| **`data-testlabel`** | Human-readable labels alongside testids |
| **`data-test-context`** | Page/section context prefix in paths |

---

## Output formats

Default format is configurable in the popup (click the extension icon).

| Format | Example |
|---|---|
| Playwright path | `div[1] > section[1] > input:email` |
| CSS selector | `section > div:nth-of-type(1) > [data-testid="email"]` |
| XPath | `/html/body/div[1]/section[1]/input[1]` |
| Playwright snippet | `await page.getByTestId('email').fill('')` |

---

## Frontend project setup

Add these attributes to your UI for cleaner, more stable paths:

| Attribute | Purpose |
|---|---|
| `data-testid` | Unique identifier for the element (primary segment) |
| `data-testlabel` | Human-readable label shown alongside the testid |
| `data-testignore` | Mark decorative/wrapper elements to skip in path |
| `data-test-context` | Set on a parent to prefix paths with page/section name |

The extension works on **any website** out of the box without special setup.

For local development:

```bash
# from the frontend/ directory
npm install
npm run dev        # starts Vite dev server on http://localhost:5175
```

Open `http://localhost:5175` in a browser with the extension installed.

---

## Install — Chrome

1. Open **chrome://extensions**
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `chromium/` folder (the one containing `manifest.json`)
5. Click the extension icon to open settings

## Install — Firefox

### Temporary (development)
1. Open **about:debugging** → **This Firefox** → **Load Temporary Add-on...**
2. Select `firefox/manifest.json`

### Permanent (signed or unsigned)
1. Set `xpinstall.signatures.required = false` in `about:config` (unsigned builds only)
2. Open `ui-path-copy-firefox.xpi` directly — drag into Firefox or double-click

---

## Usage

### Right-click
1. Right-click any element → context menu appears
2. Select **Copy Path** or **Copy URL + Path**
3. Path is in your clipboard; element flashes gold

### Inspector mode
1. Click the extension icon → **Toggle Inspector**
2. Hover any element to see its path in a floating tooltip
3. Click to copy and auto-exit inspector

### Copy all testids
Right-click → **Copy All testids on Page** or use the popup button. Outputs sorted `data-testid` values with counts for duplicates.

---

## Context menu items

| Item | Action |
|---|---|
| Copy Path | Copies element path in selected format |
| Copy URL + Path | `URL \| path` |
| Copy All testids on Page | All `data-testid` values on the page |
| Toggle Inspector Mode | Enable/disable hover-to-copy mode |

---

## Architecture

Shared code lives in `lib/`, browser-specific code in `chromium/` and `firefox/`.
Duplicate files (`popup.html`, `popup.js`, `lib/path-builder.js`) are symlinked to a single canonical copy.

```
Right-click element
  → content.js stores target (also works in iframes)
  → context menu item clicked
  → background.js routes to content script (forwards frameId)
  → content.js builds path in selected format
  → content.js writes to clipboard via navigator.clipboard
  → toast notification + highlight + console log
```

### Segment rules

| Condition | Segment |
|---|---|
| Element has `data-testid="btn:sign-in"` | `btn:sign-in` |
| Element is 2nd `<div>` among siblings | `div[2]` |
| Element has `data-testignore` | Skipped (parent used) |

The walk stops at `<body>` with a 25-depth limit (appends `...` if truncated).

### Chrome vs Firefox

| | Chrome (MV3) | Firefox (MV2) |
|---|---|---|
| Background | Service worker | Persistent page |
| API | `chrome.*` | `browser.*` |
| Message passing | Callback (`sendResponse`) | Promise (return `Promise`) |
| Clipboard | Content script writes directly | Content script writes directly |
| Inspector mode | ✅ Full | ✅ Full |
| Manifest | `manifest.json` | `firefox/manifest.json` |

---

## Development

Shared library code lives in `lib/` and is symlinked into each browser extension directory.

Test with Playwright:

```bash
node verify.js              # Unit tests for path-builder
node verify-any-site.js     # Integration tests against real sites
```
