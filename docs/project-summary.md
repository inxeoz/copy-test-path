# Project Summary: copy-test-path

## Purpose

A cross-browser extension (Chrome MV3 + Firefox MV2) that lets developers copy the DOM selector path of any page element for use in E2E tests (Playwright, Cypress, or raw CSS/XPath). Solves the problem of manually inspecting elements in DevTools to build selector strings — right-click any element, get the path instantly.

## Primary Users

- QA engineers writing Playwright or Cypress test suites
- Frontend developers debugging selector logic
- Anyone who needs a stable, unique CSS/XPath selector for a DOM element

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Chromium / Firefox | MV3 / MV2 |
| Extension API | `chrome.*` / `browser.*` | — |
| Clipboard | `navigator.clipboard` + `document.execCommand('copy')` fallback | — |
| Persistence | `storage.sync` (settings), `storage.local` (history) | — |
| Cross-tab comms | `BroadcastChannel` | — |
| Shadow DOM | Closed shadow roots for overlay isolation | — |
| SVG | Spotlight cutout via SVG path clipping | — |
| Tests | Playwright (Node.js) | ^1 |
| Packaging | Makefile + zip | — |

## File Tree

```
.
├── lib/
│   └── path-builder.js          # Canonical path logic (symlinked into both browsers)
├── chromium/                     # Chrome MV3 implementation
│   ├── manifest.json             # MV3 manifest (service worker, host_permissions)
│   ├── background.js             # Service worker: context menus, icon click
│   ├── content.js                # Injected content script (monolithic)
│   ├── popup.html                # Settings popup UI
│   ├── popup.js                  # Popup logic (module, imports i18n.js)
│   └── lib/
│       └── path-builder.js -> ../../lib/path-builder.js
├── firefox/                      # Firefox MV2 implementation
│   ├── manifest.json             # MV2 manifest (persistent background)
│   ├── background.js             # Persistent background page
│   ├── content.js                # Injected content script (thin dispatcher)
│   ├── page.html                 # Full-page settings tab
│   ├── page.js                   # Settings tab logic (module, imports i18n.js)
│   ├── epicker/                  # OLD iframe-based element picker (unused?)
│   │   ├── epicker.html
│   │   └── epicker.js
│   ├── css/
│   │   └── theme.css             # Design tokens, light + dark mode
│   ├── js/
│   │   ├── broadcast.js          # BroadcastChannel wrapper
│   │   ├── clipboard.js          # Clipboard copy with fallback
│   │   ├── highlight.js          # Gold outline flash
│   │   ├── history.js            # Last-20-paths store
│   │   ├── i18n.js               # data-i18n attribute renderer (ES module)
│   │   ├── inspector.js          # Hover-to-copy overlay (closed shadow DOM)
│   │   ├── log.js                # Styled console.log helper
│   │   ├── picker.js             # Element picker (closed shadow DOM)
│   │   ├── settings.js           # Settings loader + cache
│   │   └── toast.js              # Toast notification
│   ├── lib/
│   │   └── path-builder.js -> ../../lib/path-builder.js
│   └── _locales/
│       └── en/
│           └── messages.json     # i18n strings
├── dist/                         # Build output
│   └── copy-test-path-firefox.xpi
├── image.png                     # Extension icon
├── verify.js                     # Unit tests for path-builder
├── verify-any-site.js            # Integration tests against live sites
├── Makefile                      # Build both browser packages
└── README.md                     # User-facing documentation
```

## Entry Points

| Entry Point | File | Purpose |
|-------------|------|---------|
| Service Worker (Chrome) | `chromium/background.js` | Registers context menus, handles icon click, routes menu clicks to content scripts |
| Background Page (Firefox) | `firefox/background.js` | Same as above, uses `browser.*` API |
| Content Script (Chrome) | `chromium/content.js` | Injected into every page, handles all copy/picker/inspector actions |
| Content Script (Firefox) | `firefox/content.js` | Thin dispatcher, delegates to CTP.* modules |
| Settings UI (Chrome) | `chromium/popup.html` + `popup.js` | Popup window |
| Settings UI (Firefox) | `firefox/page.html` + `page.js` | Full browser tab |
| Path logic | `lib/path-builder.js` | All four format generators |

## Build & Run Commands

```bash
# Run unit tests
node verify.js

# Run integration tests against live sites (requires Playwright)
node verify-any-site.js

# Build distributable packages
make          # Produces dist/copy-test-path-chrome.zip and dist/copy-test-path-firefox.xpi
```

## Dependencies

### Runtime (None — pure vanilla JS in extension context)

Zero runtime dependencies. The extension uses only Web Extension APIs and standard DOM APIs.

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `playwright` | ^1 | Test runner for path-builder unit/integration tests |

Environment: Node.js 18+ for running `verify.js` and `verify-any-site.js`.

## Environment Variables

**None.** The extension has no env vars. Configuration is handled through `browser.storage.sync`.

## External Services

**None.** The extension is entirely self-contained. No APIs, databases, or third-party services.

## Local Dev Bootstrap

```bash
# 1. Clone the repo
git clone <repo-url>
cd copy-test-path

# 2. Install dev dependencies
npm install playwright       # needed for verify.js

# 3. Run unit tests
node verify.js

# 4. Load in Chrome:
#    chrome://extensions → Developer mode → Load unpacked → select chromium/

# 5. Load in Firefox (temporary):
#    about:debugging → This Firefox → Load Temporary Add-on… → firefox/manifest.json
```

No build step, no transpiler, no bundler. The extension is raw ES modules and vanilla JS.
