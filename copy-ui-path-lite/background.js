console.log('[copy-ui-path-lite] background loaded');

// ── Inject picker into a tab ──────────────────────────────────────

function injectPicker(tabId) {
  console.log('[copy-ui-path-lite] injecting picker into tab', tabId);
  browser.tabs.executeScript(tabId, { file: 'picker.js' })
    .then(function () { console.log('[copy-ui-path-lite] picker injected OK'); })
    .catch(function (err) { console.error('[copy-ui-path-lite] injection failed:', err.message); });
}

// ── Icon click ────────────────────────────────────────────────────

browser.browserAction.onClicked.addListener(function (tab) {
  injectPicker(tab.id);
});

// ── Keyboard shortcut (Ctrl+Shift+X) ─────────────────────────────

browser.commands.onCommand.addListener(function (command) {
  console.log('[copy-ui-path-lite] command received:', command);
  if (command === 'pick-element') {
    browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      if (tabs[0]) injectPicker(tabs[0].id);
    });
  }
});

// ── Right-click context menu ──────────────────────────────────────

function createContextMenus() {
  browser.contextMenus.create({
    id: 'copy-path-lite',
    title: 'Copy Path',
    contexts: ['all']
  });
}

browser.runtime.onInstalled.addListener(createContextMenus);
createContextMenus();

browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'copy-path-lite') {
    injectPicker(tab.id);
  }
});
