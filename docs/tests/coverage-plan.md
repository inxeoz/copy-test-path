# Test Coverage Plan

## Test Harness

| Aspect | Value |
|--------|-------|
| Framework | Playwright (Node.js) |
| Install | `npm install playwright` |
| Run all | `node verify.js && node verify-any-site.js` |
| Run unit | `node verify.js` |
| Run integration | `node verify-any-site.js` |
| File location | `verify.js` (unit), `verify-any-site.js` (integration) |

## Per-Feature Coverage

| Chapter | Feature | Tier | Effort | Unit Tests | Integration Tests | E2E Tests |
|---------|---------|------|--------|-----------|------------------|-----------|
| 1 | Path Builder — Playwright Path | Core | High | 5 tests: path with testid+label, shouldSkip, shadow DOM traversal, nested shadow, testContext | — | — |
| 2 | Path Builder — CSS, XPath, Snippet | Core | Medium | 7 tests: CSS selector, XPath, snippet (input, button, no-id), getAllTestIds, empty testids format | — | — |
| 3 | Clipboard, Toast, Highlight, Log | Supporting | Low | — | — | Chrome: clipboard match on live sites |
| 4 | History & BroadcastChannel | Supporting | Low | — | — | — |
| 5 | Firefox Content Script & Background | Core | Medium | — | Firefox: content script injection, message handling | — |
| 6 | Inspector Mode | Core | Medium | — | — | Manual: toggle, hover, click, ESC |
| 7 | Element Picker | Core | High | — | — | Manual: launch, hover, click, drag, ESC |
| 8 | Settings Page (Firefox) | Supporting | Medium | — | — | Manual: format change persists, history live update |
| 9 | Chrome MV3 Implementation | Core | Medium | — | Chrome: extension loads, context menus appear, clipboard match on live sites | Manual: full flow |
| 10 | Makefile & Distribution | Minor | Low | File existence checks in verify.js | — | — |
| 11 | Integration Tests | Minor | Low | — | Chrome: clipboard match on example.com, github.com | — |

## Risk Areas

Chapters needing integration tests (not just unit tests):

| Chapter | Feature | Risk | Reason |
|---------|---------|------|--------|
| 3 | Clipboard | **High** | Clipboard APIs behave differently across browsers and contexts. The fallback path (textarea + execCommand) can't be fully unit tested. |
| 6 | Inspector Mode | **Medium** | State machine with DOM event listeners. Race conditions: double-click, rapid toggle, page navigation while active. |
| 7 | Element Picker | **High** | Shadow DOM injection, SVG spotlight, drag behavior, throttle timing. Hard to unit test because it creates a closed shadow root and interacts with page coordinates. |
| 8 | Settings Page | **Medium** | Cross-tab communication via BroadcastChannel, storage.sync persistence, source tab lifecycle. |
| 9 | Chrome MV3 | **High** | Service worker lifecycle (ephemeral), scripting API differences from Firefox, context menu registration timing. |

## Recommended Test Additions

1. **Clipboard module**: Add a Playwright test that disables `navigator.clipboard.writeText` (via `page.evaluate` to set it to `undefined`) and verifies the fallback works.
2. **History module**: Add a unit test that mocks `browser.storage.local` and verifies the 20-item cap and `unshift` behavior.
3. **Inspector mode**: Add a Playwright test that toggles inspector, moves the mouse, clicks an element, and verifies clipboard content.
4. **Picker**: Add a Playwright test that injects the picker, moves the mouse over known coordinates, and verifies the SVG spotlight paths are valid.
5. **Path builder edge cases**: Add tests for:
   - Empty `data-testid` value (attribute present but value is `""`)
   - Element with no `parentElement` (detached DOM node)
   - `pathDepth` truncation with `1` and `5`
   - 26+ step deep DOM tree (truncation with `...`)
   - `data-testid` value containing double quotes (malformed selector)
