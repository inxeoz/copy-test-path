console.log('[copy-ui-path-lite] background loaded');

browser.browserAction.onClicked.addListener(function(tab) {
  console.log('[copy-ui-path-lite] icon clicked, injecting picker into tab', tab.id);
  browser.tabs.executeScript(tab.id, { file: 'picker.js' })
    .then(function() { console.log('[copy-ui-path-lite] picker injected OK'); })
    .catch(function(err) { console.error('[copy-ui-path-lite] injection failed:', err.message); });
});
