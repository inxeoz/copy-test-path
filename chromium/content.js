let lastRightClicked = null;
let hoverEnabled = false;
let tooltipEl = null;
let modeIndicator = null;
let currentHoverEl = null;
let highlightTimer = null;

const settings = {
  format: 'playwright-path',
  highlight: true,
  shadowDom: true,
  skipTestignore: true,
};

(async () => {
  const stored = await chrome.storage.sync.get(settings);
  Object.assign(settings, stored);

  document.addEventListener('contextmenu', e => {
    lastRightClicked = (e.target && e.target.nodeType === Node.ELEMENT_NODE) ? e.target : document.activeElement;
  }, true);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'get-nav-path') {
      if (!lastRightClicked) { showToast('Right-click an element first', true); sendResponse({}); return; }
      const el = lastRightClicked;
      lastRightClicked = null;
      const text = formatPath(el, settings);
      copyToClipboard(text).then(() => { highlightElement(el); showToast('Copied!'); logCopy('Copied', text); })
        .catch(() => showToast('Clipboard failed', true));
      sendResponse({ ok: true });
    }

    if (msg.action === 'get-url-path') {
      if (!lastRightClicked) { showToast('Right-click an element first', true); sendResponse({}); return; }
      const el = lastRightClicked;
      lastRightClicked = null;
      const text = location.href + ' | ' + formatPath(el, settings);
      copyToClipboard(text).then(() => { highlightElement(el); showToast('Copied!'); logCopy('Copied URL + path', text); })
        .catch(() => showToast('Clipboard failed', true));
      sendResponse({ ok: true });
    }

    if (msg.action === 'get-all-testids') {
      const map = getAllTestIds();
      const text = formatAllTestIds(map);
      copyToClipboard(text).then(() => {
        const n = Object.keys(map).length;
        showToast('Copied ' + n + ' testid' + (n !== 1 ? 's' : ''));
        logCopy('Copied ' + n + ' testid' + (n !== 1 ? 's' : ''), text.slice(0, 80));
      }).catch(() => showToast('Clipboard failed', true));
      sendResponse({ ok: true });
    }

    if (msg.action === 'toggle-inspector') {
      toggleInspector();
      sendResponse({ ok: true });
    }
  });

  chrome.storage.onChanged.addListener(changes => {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in settings) settings[key] = newValue;
    }
  });
})();

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(resolve).catch(() => fallbackCopy(text, resolve, reject));
    } else {
      fallbackCopy(text, resolve, reject);
    }
  });
}

function fallbackCopy(text, resolve, reject) {
  if (!document.body) { reject(new Error('no body')); return; }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); resolve(); }
  catch { reject(); }
  finally { document.body.removeChild(ta); }
}

function highlightElement(el) {
  if (!settings.highlight) return;
  if (highlightTimer) clearTimeout(highlightTimer);
  const orig = {
    outline: el.style.outline,
    outlineOffset: el.style.outlineOffset,
    background: el.style.background,
    transition: el.style.transition,
  };
  Object.assign(el.style, {
    outline: '2px solid #FFD700',
    outlineOffset: '2px',
    background: 'rgba(255, 215, 0, 0.12)',
    transition: 'outline 0.3s, background 0.3s',
  });
  highlightTimer = setTimeout(() => {
    Object.assign(el.style, orig);
    highlightTimer = null;
  }, 1200);
}

function showToast(msg, isError) {
  if (!document.body) return;
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;background:' + (isError ? '#dc2626' : '#1E3A5F') + ';color:#fff;font:13px/1.4 sans-serif;padding:8px 16px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
}

function logCopy(label, text) {
  const preview = text.length > 120 ? text.slice(0, 120) + '\u2026' : text;
  console.log(
    '%ccopy-test-path%c ' + label + ': ' + preview,
    'background:#1E3A5F;color:#FFD700;padding:2px 6px;border-radius:4px;font-weight:700;',
    'color:#0f172a;'
  );
}

function createTooltip() {
  if (!document.body) return null;
  const d = document.createElement('div');
  d.id = 'ui-path-copy-tooltip';
  d.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;background:#1E3A5F;color:#FFD700;font:12px/1.4 monospace;padding:5px 10px;border-radius:4px;max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:none;';
  document.body.appendChild(d);
  return d;
}

function onHover(e) {
  if (e.target.id === 'ui-path-copy-mode-indicator') return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === currentHoverEl || el.id === 'ui-path-copy-mode-indicator' || el.closest('#ui-path-copy-tooltip')) return;
  currentHoverEl = el;
  const path = formatPath(el, settings);
  if (!tooltipEl) return;
  tooltipEl.textContent = path;
  tooltipEl.style.display = 'block';
  let x = e.clientX + 18, y = e.clientY + 18;
  if (x + 520 > innerWidth) x = e.clientX - 530;
  if (y + 30 > innerHeight) y = e.clientY - 40;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
}

function onClickInspector(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el.id === 'ui-path-copy-tooltip' || el.id === 'ui-path-copy-mode-indicator') return;
  e.preventDefault();
  e.stopPropagation();
  const path = formatPath(el, settings);
  if (!path) return;
  copyToClipboard(path).then(() => {
    highlightElement(el);
    showToast('Copied!');
    logCopy('Inspector copied', path);
    toggleInspector(false);
  }).catch(() => showToast('Clipboard failed', true));
}

function createModeIndicator() {
  const d = document.createElement('div');
  d.id = 'ui-path-copy-mode-indicator';
  d.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#1E3A5F;color:#FFD700;font:13px/1.4 sans-serif;padding:8px 16px;border-radius:6px;box-shadow:0 2px 14px rgba(0,0,0,0.35);cursor:pointer;';
  d.textContent = 'Inspector \u2014 click to copy \u00b7 click here to exit';
  d.title = 'Exit Inspector mode';
  d.addEventListener('click', () => toggleInspector(false));
  document.body.appendChild(d);
  return d;
}

function toggleInspector(force) {
  const enable = force !== undefined ? force : !hoverEnabled;
  hoverEnabled = enable;
  if (enable) {
    tooltipEl = createTooltip();
    modeIndicator = createModeIndicator();
    document.addEventListener('mousemove', onHover, { passive: true });
    document.addEventListener('click', onClickInspector, true);
  } else {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (modeIndicator) { modeIndicator.remove(); modeIndicator = null; }
    document.removeEventListener('mousemove', onHover);
    document.removeEventListener('click', onClickInspector, true);
    currentHoverEl = null;
  }
}


