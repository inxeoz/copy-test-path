import { msg, render } from './js/i18n.js';

const api = typeof browser !== 'undefined' ? browser : chrome;
const $ = id => document.getElementById(id);

const params = new URLSearchParams(location.search);
const sourceTabId = params.has('tab') ? parseInt(params.get('tab'), 10) : null;

async function loadSettings() {
  const defaults = { format: 'playwright-path', highlight: true, shadowDom: true, skipTestignore: true, pathDepth: 'all' };
  const s = await api.storage.sync.get(defaults);
  $('format').value           = s.format;
  $('pathDepth').value        = s.pathDepth;
  $('highlight').checked      = s.highlight;
  $('shadowDom').checked      = s.shadowDom;
  $('skipTestignore').checked = s.skipTestignore;
}

function bindSettings() {
  $('format').addEventListener('change',        e => api.storage.sync.set({ format: e.target.value }));
  $('pathDepth').addEventListener('change',     e => api.storage.sync.set({ pathDepth: e.target.value }));
  $('highlight').addEventListener('change',     e => api.storage.sync.set({ highlight: e.target.checked }));
  $('shadowDom').addEventListener('change',     e => api.storage.sync.set({ shadowDom: e.target.checked }));
  $('skipTestignore').addEventListener('change', e => api.storage.sync.set({ skipTestignore: e.target.checked }));
}

let statusTimer = null;
function showStatus(text, type) {
  const el = $('status');
  el.textContent = text;
  el.className = type;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.className = ''; }, 3500);
}

async function setupTabHint() {
  const hint = $('tabHint');
  const urlEl = hint.querySelector('.tab-url');
  if (!sourceTabId) return;
  try {
    const tab = await api.tabs.get(sourceTabId);
    const url = tab.url || 'Unknown tab';
    urlEl.textContent = url;
    urlEl.title = url;
    hint.classList.add('connected');
  } catch {
    urlEl.textContent = 'Source tab is no longer available';
  }
}

async function sendToTab(payload) {
  if (!sourceTabId) {
    showStatus('Open this page from the extension icon to use actions', 'error');
    return;
  }
  try {
    await api.tabs.sendMessage(sourceTabId, payload);
    showStatus(msg('statusDone'), 'success');
  } catch {
    showStatus(msg('statusNotLoaded'), 'error');
  }
}

function setupDarkMode() {
  const btn  = $('darkToggle');
  const html = document.documentElement;
  if (localStorage.getItem('copy-test-path-theme') === 'dark') html.classList.add('dark');
  btn.addEventListener('click', () => {
    html.classList.toggle('dark');
    localStorage.setItem('copy-test-path-theme', html.classList.contains('dark') ? 'dark' : 'light');
  });
}

const FORMAT_SHORT = {
  'playwright-path': 'Playwright',
  'css-selector':   'CSS',
  'xpath':          'XPath',
  'test-snippet':   'Snippet',
};

function relativeTime(ts) {
  const d = Date.now() - ts;
  if (d < 60_000)        return 'just now';
  if (d < 3_600_000)     return Math.floor(d / 60_000) + 'm ago';
  if (d < 86_400_000)    return Math.floor(d / 3_600_000) + 'h ago';
  return Math.floor(d / 86_400_000) + 'd ago';
}

async function loadHistory() {
  const el = $('history');
  if (!el) return;
  const { history: items } = await api.storage.local.get({ history: [] });
  el.innerHTML = '';

  if (!items.length) {
    el.innerHTML = '<div class="history-empty">No paths copied yet.<br>Right-click any element and choose <strong>Copy Path</strong>, or use the element picker.</div>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'history-list';

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'history-item';

    const badge = document.createElement('span');
    badge.className = 'history-badge';
    badge.textContent = FORMAT_SHORT[item.format] || item.format || 'Path';

    const path = document.createElement('span');
    path.className = 'history-path';
    path.textContent = item.path;

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = item.ts ? relativeTime(item.ts) : '';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(item.path).then(() => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1500);
      }).catch(() => {});
    });

    meta.append(time, copyBtn);
    row.append(badge, path, meta);
    list.appendChild(row);
  }

  el.appendChild(list);
}

document.addEventListener('DOMContentLoaded', async () => {
  render();
  await loadSettings();
  bindSettings();
  setupDarkMode();
  setupTabHint();
  loadHistory();

  $('pickElement').addEventListener('click', async () => {
    if (!sourceTabId) { showStatus('Open this page from the extension icon to use actions', 'error'); return; }
    try {
      await api.tabs.executeScript(sourceTabId, { file: 'js/picker.js' });
      await api.tabs.update(sourceTabId, { active: true });
    } catch {
      showStatus(msg('statusNotLoaded'), 'error');
    }
  });

  $('copyAll').addEventListener('click', () => sendToTab({ action: 'get-all-testids' }));

  $('toggleInspector').addEventListener('click', async () => {
    await sendToTab({ action: 'toggle-inspector' });
    if (sourceTabId) api.tabs.update(sourceTabId, { active: true }).catch(() => {});
  });

  $('clearHistory').addEventListener('click', async () => {
    await api.storage.local.set({ history: [] });
    loadHistory();
  });

  const bc = new BroadcastChannel('copy-test-path');
  bc.addEventListener('message', e => {
    if (e.data.type === 'copied') loadHistory();
  });
});
