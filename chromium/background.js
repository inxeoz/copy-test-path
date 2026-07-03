function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'copy-nav-path', title: 'Copy Path', contexts: ['all'] });
    chrome.contextMenus.create({ id: 'copy-url-path', title: 'Copy URL + Path', contexts: ['all'] });
    chrome.contextMenus.create({ id: 'separator-1', type: 'separator', contexts: ['all'] });
    chrome.contextMenus.create({ id: 'pick-element', title: 'Pick element from page', contexts: ['all'] });
    chrome.contextMenus.create({ id: 'copy-all-testids', title: 'Copy All testids on Page', contexts: ['all'] });
    chrome.contextMenus.create({ id: 'toggle-inspector', title: 'Toggle Inspector Mode', contexts: ['all'] });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenus);
createContextMenus();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'popup.html' });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'pick-element') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['js/picker.js'] })
        .catch(err => console.warn('copy-test-path:', err.message));
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'pick-element') {
    chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [info.frameId] }, files: ['js/picker.js'] })
      .catch(err => console.warn('copy-test-path:', err.message));
    return;
  }

  const action = {
    'copy-nav-path': 'get-nav-path',
    'copy-url-path': 'get-url-path',
    'copy-all-testids': 'get-all-testids',
    'toggle-inspector': 'toggle-inspector',
  }[info.menuItemId];
  if (action) {
    chrome.tabs.sendMessage(tab.id, { action }, { frameId: info.frameId }, () => {
      if (chrome.runtime.lastError) console.warn('copy-test-path:', chrome.runtime.lastError.message);
    });
  }
});
