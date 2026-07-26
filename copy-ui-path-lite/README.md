# copy-ui-path-lite

Lightweight browser extension for picking DOM elements and copying their selector paths for E2E testing.

## Install (Development)

```bash
npm install -g web-ext
web-ext run
```

## Build for AMO (Firefox Add-ons)

```bash
# Build the zip (output: web-ext-artifacts/copy-ui-path-lite-1.1.0.zip)
web-ext build

# Lint before submitting
web-ext lint
```

Upload the zip from `web-ext-artifacts/` to [addons.mozilla.org](https://addons.mozilla.org/developer/addon/).

## Features

- Click toolbar icon → hover element → click to copy path
- Supports `data-testid`, `data-test`, `data-cy`, `data-qa`, and 6 more test attributes
- Playwright path when test attribute found, XPath otherwise
- URL prefix included in copied path
- Context annotations: `div[1](post-card)`
- Shadow DOM support
- `Ctrl+Shift+X` keyboard shortcut
- Right-click context menu "Copy Path"
- Dark mode support
