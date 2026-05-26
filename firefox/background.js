function createContextMenus() {
  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({ id: 'copy-nav-path', title: 'Copy Path', contexts: ['all'] });
    browser.contextMenus.create({ id: 'copy-url-path', title: 'Copy URL + Path', contexts: ['all'] });
    browser.contextMenus.create({ id: 'separator-1', type: 'separator', contexts: ['all'] });
    browser.contextMenus.create({ id: 'copy-all-testids', title: 'Copy All testids on Page', contexts: ['all'] });
    browser.contextMenus.create({ id: 'toggle-inspector', title: 'Toggle Inspector Mode', contexts: ['all'] });
  });
}

browser.runtime.onInstalled.addListener(createContextMenus);
createContextMenus();

browser.contextMenus.onClicked.addListener((info, tab) => {
  const actionMap = {
    'copy-nav-path': 'get-nav-path',
    'copy-url-path': 'get-url-path',
    'copy-all-testids': 'get-all-testids',
    'toggle-inspector': 'toggle-inspector',
  };
  const action = actionMap[info.menuItemId];
  if (!action) return;

  browser.tabs.sendMessage(tab.id, { action }, { frameId: info.frameId })
    .catch(err => console.warn('copy-test-path:', err.message));
});
