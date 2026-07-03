const i18n = (typeof browser !== 'undefined' && browser.i18n ? browser : chrome).i18n;

function createContextMenus() {
  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({ id: 'copy-nav-path', title: i18n.getMessage('contextMenuCopyPath'), contexts: ['all'] });
    browser.contextMenus.create({ id: 'copy-url-path', title: i18n.getMessage('contextMenuCopyUrlPath'), contexts: ['all'] });
    browser.contextMenus.create({ id: 'separator-1', type: 'separator', contexts: ['all'] });
    browser.contextMenus.create({ id: 'pick-element', title: i18n.getMessage('contextMenuPickElement'), contexts: ['all'] });
    browser.contextMenus.create({ id: 'copy-all-testids', title: i18n.getMessage('contextMenuCopyAllTestIds'), contexts: ['all'] });
    browser.contextMenus.create({ id: 'toggle-inspector', title: i18n.getMessage('contextMenuToggleInspector'), contexts: ['all'] });
  });
}

browser.runtime.onInstalled.addListener(createContextMenus);
createContextMenus();

browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.create({ url: browser.runtime.getURL('page.html') + '?tab=' + tab.id });
});

console.log('copy-test-path: background loaded, browser.commands:', typeof browser.commands);
browser.commands.onCommand.addListener((command) => {
  console.log('copy-test-path: command received', command);
  if (command === 'pick-element') {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      console.log('copy-test-path: injecting picker into tab', tab.id);
      browser.tabs.executeScript(tab.id, { file: 'js/picker.js' })
        .catch(err => console.warn('copy-test-path:', err.message));
    });
  }
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'pick-element') {
    browser.tabs.executeScript(tab.id, { file: 'js/picker.js', frameId: info.frameId })
      .catch(err => console.warn('copy-test-path:', err.message));
    return;
  }

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
