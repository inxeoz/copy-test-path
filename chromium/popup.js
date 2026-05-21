const api = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', async () => {
  const defaults = { format: 'playwright-path', highlight: true, shadowDom: true, skipTestignore: true };
  const settings = await api.storage.sync.get(defaults);

  const $ = id => document.getElementById(id);

  $('format').value = settings.format;
  $('highlight').checked = settings.highlight;
  $('shadowDom').checked = settings.shadowDom;
  $('skipTestignore').checked = settings.skipTestignore;

  $('format').addEventListener('change', e => api.storage.sync.set({ format: e.target.value }));
  $('highlight').addEventListener('change', e => api.storage.sync.set({ highlight: e.target.checked }));
  $('shadowDom').addEventListener('change', e => api.storage.sync.set({ shadowDom: e.target.checked }));
  $('skipTestignore').addEventListener('change', e => api.storage.sync.set({ skipTestignore: e.target.checked }));

  function showStatus(msg) {
    const el = $('status');
    el.textContent = msg;
    el.style.display = 'block';
  }

  async function sendToTab(msg) {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    try {
      await api.tabs.sendMessage(tab.id, msg);
      window.close();
    } catch (err) {
      showStatus('Content script not loaded on this page');
    }
  }

  $('copyAll').addEventListener('click', () => sendToTab({ action: 'get-all-testids' }));

  $('toggleInspector').addEventListener('click', () => sendToTab({ action: 'toggle-inspector' }));
});
