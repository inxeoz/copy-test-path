import { msg, render } from './js/i18n.js';

const api = typeof browser !== 'undefined' ? browser : chrome;

const $ = id => document.getElementById(id);

async function loadSettings() {
  const defaults = { format: 'playwright-path', highlight: true, shadowDom: true, skipTestignore: true };
  const settings = await api.storage.sync.get(defaults);
  $('format').value = settings.format;
  $('highlight').checked = settings.highlight;
  $('shadowDom').checked = settings.shadowDom;
  $('skipTestignore').checked = settings.skipTestignore;
  return settings;
}

function bindSettings() {
  $('format').addEventListener('change', e => api.storage.sync.set({ format: e.target.value }));
  $('highlight').addEventListener('change', e => api.storage.sync.set({ highlight: e.target.checked }));
  $('shadowDom').addEventListener('change', e => api.storage.sync.set({ shadowDom: e.target.checked }));
  $('skipTestignore').addEventListener('change', e => api.storage.sync.set({ skipTestignore: e.target.checked }));
}

function showStatus(el, msgText, type) {
  el.textContent = msgText;
  el.className = type;
}

async function sendToTab(payload) {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  try {
    await api.tabs.sendMessage(tab.id, payload);
    showStatus($('status'), msg('statusDone'), 'success');
  } catch {
    showStatus($('status'), msg('statusNotLoaded'), 'error');
  }
}

function toggleSection(id) {
  const body = document.body;
  const bits = body.dataset.more || '';
  const has = bits.includes(id);
  body.dataset.more = has ? bits.replace(id, '') : bits + id;
}

function setupSections() {
  $('toggleFormat').addEventListener('click', () => toggleSection('a'));
  $('toggleBehaviors').addEventListener('click', () => toggleSection('b'));
}

function setupDarkMode() {
  const btn = $('darkToggle');
  const html = document.documentElement;
  const stored = localStorage.getItem('copy-test-path-theme');
  if (stored === 'dark') html.classList.add('dark');
  btn.addEventListener('click', () => {
    html.classList.toggle('dark');
    localStorage.setItem('copy-test-path-theme', html.classList.contains('dark') ? 'dark' : 'light');
  });
}

async function loadHistory() {
  const el = $('history');
  if (!el) return;
  const data = await api.storage.local.get({ history: [] });
  const items = data.history;
  el.innerHTML = '';
  if (items.length === 0) return;
  const fragment = document.createDocumentFragment();
  for (const item of items.slice(0, 5)) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.title = 'Click to re-copy';
    div.addEventListener('click', () => {
      navigator.clipboard.writeText(item.path).catch(() => {});
    });
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = msg(item.formatKey || 'formatPlaywrightPath') + ': ';
    div.appendChild(label);
    div.appendChild(document.createTextNode(item.path));
    fragment.appendChild(div);
  }
  el.appendChild(fragment);
}

document.addEventListener('DOMContentLoaded', async () => {
  render();
  await loadSettings();
  bindSettings();
  setupSections();
  setupDarkMode();
  loadHistory();

  $('pickElement').addEventListener('click', async () => {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    api.tabs.executeScript(tab.id, { file: 'js/picker.js' }).catch(() => {
      showStatus($('status'), msg('statusNotLoaded'), 'error');
    });
  });
  $('copyAll').addEventListener('click', () => sendToTab({ action: 'get-all-testids' }));
  $('toggleInspector').addEventListener('click', () => sendToTab({ action: 'toggle-inspector' }));

  const bc = new BroadcastChannel('copy-test-path');
  bc.addEventListener('message', e => {
    if (e.data.type === 'copied') {
      loadHistory();
    }
  });
});
