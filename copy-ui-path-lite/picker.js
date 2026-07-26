(function () {
  console.log('[copy-ui-path-lite] picker.js loaded');
  if (document.getElementById('ctp-picker-root')) {
    console.log('[copy-ui-path-lite] picker already active, skipping');
    return;
  }

  // Inject shake animation
  var style = document.createElement('style');
  style.textContent = '@keyframes ctp-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}';
  document.head.appendChild(style);

  // ── Path building ──────────────────────────────────────────────────

  function siblingIndex(el) {
    const p = el.parentElement;
    if (!p) return 1;
    const siblings = Array.from(p.children).filter(function (c) { return c.tagName === el.tagName; });
    return siblings.indexOf(el) + 1;
  }

  function testContext(el) {
    const ctx = el.closest('[data-test-context]');
    return ctx ? ctx.getAttribute('data-test-context') : '';
  }

  function shouldSkip(el) {
    return el.hasAttribute('data-testignore');
  }

  function segPlaywright(el) {
    const tid = el.getAttribute('data-testid');
    if (tid) {
      const label = el.getAttribute('data-testlabel');
      return label ? tid + '[data-testlabel="' + label + '"]' : tid;
    }
    return el.tagName.toLowerCase() + '[' + siblingIndex(el) + ']';
  }

  function segXPath(el) {
    const tid = el.getAttribute('data-testid');
    if (tid) return '*[@data-testid="' + tid + '"]';
    return el.tagName.toLowerCase() + '[' + siblingIndex(el) + ']';
  }

  function walkUp(el, segmentFn) {
    var segs = [];
    var cur = el;
    var depth = 0;
    while (cur && cur !== document.documentElement && cur !== document.body && depth < 25) {
      if (shouldSkip(cur)) { cur = cur.parentElement; depth++; continue; }
      var parent = cur.parentElement;
      if (!parent) {
        var root = cur.getRootNode ? cur.getRootNode() : null;
        if (root instanceof ShadowRoot && root.host && cur !== root.host) {
          segs.unshift(segmentFn(cur));
          segs.unshift('{shadow}');
          cur = root.host;
          depth += 2;
          continue;
        }
      }
      segs.unshift(segmentFn(cur));
      cur = cur.parentElement;
      depth++;
    }
    if (depth >= 25) segs.unshift('...');
    return segs;
  }

  function buildPlaywrightPath(el) {
    var ctx = testContext(el);
    var p = walkUp(el, segPlaywright).join(' > ');
    return ctx ? ctx + ' | ' + p : p;
  }

  function buildXPath(el) {
    return '/' + walkUp(el, segXPath).join('/');
  }

  function formatPath(el) {
    var tid = el.getAttribute('data-testid');
    if (tid) {
      console.log('[copy-ui-path-lite] element has testid:', tid, '-> using Playwright path');
      return buildPlaywrightPath(el);
    }
    console.log('[copy-ui-path-lite] no testid -> using XPath');
    return buildXPath(el);
  }

  function formatPreview(el) {
    return buildXPath(el);
  }

  // ── Shadow DOM element detection ───────────────────────────────────

  function elFromPoint(x, y) {
    host.style.setProperty('display', 'none', 'important');
    var el = document.elementFromPoint(x, y);
    host.style.removeProperty('display');
    return el;
  }

  // ── Clipboard ──────────────────────────────────────────────────────

  function copyToClipboard(text) {
    return new Promise(function (resolve, reject) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(resolve).catch(function () {
          fallbackCopy(text, resolve, reject);
        });
      } else {
        fallbackCopy(text, resolve, reject);
      }
    });
  }

  function fallbackCopy(text, resolve, reject) {
    if (!document.body) { reject(new Error('no body')); return; }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); resolve(); }
    catch (e) { reject(e); }
    finally { document.body.removeChild(ta); }
  }

  // ── Toast ──────────────────────────────────────────────────────────

  function showToast(msg, isError) {
    if (!document.body) return;
    var existing = document.getElementById('ctp-lite-toast');
    if (existing) existing.remove();
    var d = document.createElement('div');
    d.id = 'ctp-lite-toast';
    d.textContent = msg;
    var bg = isError ? '#dc2626' : '#22c55e';
    d.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;background:' + bg + ';color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;padding:10px 18px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,0.3);transition:opacity 0.4s;animation:ctp-shake 0.4s ease;';
    document.body.appendChild(d);
    setTimeout(function () { d.style.opacity = '0'; }, 2200);
    setTimeout(function () { d.remove(); }, 2600);
  }

  // ── Hide picker overlay ────────────────────────────────────────────

  function hidePicker() {
    host.style.display = 'none';
    hlEl.style.display = 'none';
    ttEl.style.display = 'none';
  }

  // ── UI ─────────────────────────────────────────────────────────────

  var host = document.createElement('div');
  host.id = 'ctp-picker-root';
  Object.assign(host.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    zIndex: '2147483647', pointerEvents: 'none'
  });

  var shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = [
    '<style>',
    '*,*::before,*::after{box-sizing:border-box}',
    '#overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;cursor:crosshair;pointer-events:auto}',
    '#dialog{position:fixed;bottom:20px;right:20px;min-width:190px;max-width:420px;background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.25),0 1px 4px rgba(0,0,0,.1);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:13px;color:#1e293b;pointer-events:auto;z-index:1;transition:width .12s ease}',
    '#dialog-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#1E3A5F;color:#FFD700;font-weight:600;font-size:13px;cursor:move;user-select:none;white-space:nowrap}',
    '#quitBtn{background:none;border:none;color:#FFD700;font-size:20px;cursor:pointer;padding:0 4px;line-height:1;opacity:.7;flex-shrink:0}',
    '#quitBtn:hover{opacity:1}',
    '#path-display{padding:12px 14px;font-family:SF Mono,Cascadia Code,Fira Code,Menlo,Consolas,monospace;font-size:12px;color:#1e293b;background:#f8fafc;border-bottom:1px solid #e2e8f0;word-break:break-all;line-height:1.5;min-height:40px;max-height:120px;overflow-y:auto;white-space:pre-wrap}',
    '#dialog-actions{padding:10px 14px;display:flex;justify-content:flex-end;gap:8px}',
    '.primary{padding:7px 18px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;background:#1E3A5F;color:#FFD700;transition:background .15s}',
    '.primary:hover{background:#2a5070}',
    '.primary:active{background:#16304a}',
    '</style>',
    '<svg id="overlay" xmlns="http://www.w3.org/2000/svg">',
    '<path id="ocean" fill="rgba(0,0,0,0.4)" fill-rule="evenodd" d=""/>',
    '<path id="island" fill="rgba(255,215,0,0.2)" stroke="#FFD700" stroke-width="2" d=""/>',
    '</svg>',
    '<div id="dialog">',
    '<div id="dialog-header"><span>Element picker</span><button id="quitBtn" title="Quit">&times;</button></div>',
    '<div id="path-display">Hover over an element...</div>',
    '<div id="dialog-actions"><button id="copyBtn" class="primary">Copy path</button></div>',
    '</div>'
  ].join('\n');

  document.documentElement.appendChild(host);

  var overlay = shadow.querySelector('#overlay');
  var ocean = shadow.querySelector('#ocean');
  var island = shadow.querySelector('#island');
  var dialog = shadow.querySelector('#dialog');
  var dialogHeader = shadow.querySelector('#dialog-header');
  var pathDisplay = shadow.querySelector('#path-display');
  var copyBtn = shadow.querySelector('#copyBtn');
  var quitBtn = shadow.querySelector('#quitBtn');

  // Highlight overlay
  var hlEl = document.createElement('div');
  hlEl.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #4A90D9;z-index:2147483646;display:none;';
  document.body.appendChild(hlEl);

  // Tooltip
  var ttEl = document.createElement('div');
  ttEl.style.cssText = 'position:fixed;z-index:2147483647;background:rgba(30,41,59,0.92);color:#FFD700;font:12px/1.4 SF Mono,Cascadia Code,Menlo,Consolas,monospace;padding:5px 10px;border-radius:4px;pointer-events:none;white-space:nowrap;display:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
  document.body.appendChild(ttEl);

  var currentEl = null;
  var currentPath = '';
  var dragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var throttleTimer = null;
  var lastX = 0;
  var lastY = 0;

  function updateUI(el) {
    if (!el || el === currentEl) return;
    currentEl = el;
    var rect = el.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // SVG spotlight
    ocean.setAttribute('d', 'M0 0h' + vw + 'v' + vh + 'h-' + vw + 'z M' + rect.left + ' ' + rect.top + 'h' + rect.width + 'v' + rect.height + 'h-' + rect.width + 'z');
    island.setAttribute('d', 'M' + rect.left + ' ' + rect.top + 'h' + rect.width + 'v' + rect.height + 'h-' + rect.width + 'z');

    // Blue outline highlight
    hlEl.style.left = rect.left + 'px';
    hlEl.style.top = rect.top + 'px';
    hlEl.style.width = rect.width + 'px';
    hlEl.style.height = rect.height + 'px';
    hlEl.style.display = 'block';

    // Tooltip with element info
    var tag = el.tagName.toLowerCase();
    var id = el.id ? '#' + el.id : '';
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '';
    var tid = el.getAttribute('data-testid');
    var tidStr = tid ? ' [testid=' + tid + ']' : '';
    var dim = Math.round(rect.width) + '\u00d7' + Math.round(rect.height);
    ttEl.textContent = tag + id + cls + tidStr + ' ' + dim;
    var tx = lastX + 18;
    var ty = lastY + 18;
    var ttRect = ttEl.getBoundingClientRect();
    if (tx + ttRect.width > vw) tx = lastX - ttRect.width - 18;
    if (ty + ttRect.height > vh) ty = lastY - ttRect.height - 18;
    ttEl.style.left = tx + 'px';
    ttEl.style.top = ty + 'px';
    ttEl.style.display = 'block';

    // Path display (always XPath for preview)
    currentPath = location.href + ' | ' + formatPreview(el);
    pathDisplay.textContent = currentPath;
    if (!dragging) {
      var w = Math.min(420, Math.max(190, Math.ceil(currentPath.length * 7.5) + 56));
      dialog.style.width = w + 'px';
    }
  }

  function doCopy() {
    if (!currentPath) return;
    var copyText = location.href + ' | ' + formatPath(currentEl);
    console.log('[copy-ui-path-lite] ──────────────────────────────────────');
    console.log('[copy-ui-path-lite] COPIED TO CLIPBOARD:');
    console.log('[copy-ui-path-lite]', copyText);
    console.log('[copy-ui-path-lite] ──────────────────────────────────────');
    hidePicker();
    copyToClipboard(copyText).then(function () {
      var preview = copyText.length > 60 ? copyText.slice(0, 57) + '...' : copyText;
      showToast('Copied Path : ' + preview);
      setTimeout(quit, 1500);
    }).catch(function () {
      console.error('[copy-ui-path-lite] clipboard write FAILED');
      showToast('Clipboard failed', true);
      setTimeout(quit, 1500);
    });
  }

  function quit() {
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('click', onOverlayClick);
    dialogHeader.removeEventListener('mousedown', onDragStart);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('keydown', onKeyDown, true);
    hlEl.remove();
    ttEl.remove();
    host.remove();
  }

  function onMouseMove(e) {
    if (dragging) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (throttleTimer) return;
    throttleTimer = setTimeout(function () { throttleTimer = null; }, 30);
    var el = elFromPoint(e.clientX, e.clientY);
    if (el) updateUI(el);
  }

  function onOverlayClick(e) {
    if (dragging) return;
    e.preventDefault();
    e.stopPropagation();
    var el = elFromPoint(e.clientX, e.clientY);
    if (el) {
      updateUI(el);
      doCopy();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') quit();
  }

  function onDragStart(e) {
    if (e.target === quitBtn) return;
    dragging = true;
    var rect = dialog.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    dialog.style.left = rect.left + 'px';
    dialog.style.top = rect.top + 'px';
    dialog.style.right = 'auto';
    dialog.style.bottom = 'auto';
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!dragging) return;
    var x = Math.max(0, Math.min(e.clientX - dragOffsetX, window.innerWidth - dialog.offsetWidth));
    var y = Math.max(0, Math.min(e.clientY - dragOffsetY, window.innerHeight - dialog.offsetHeight));
    dialog.style.left = x + 'px';
    dialog.style.top = y + 'px';
  }

  function onDragEnd() {
    dragging = false;
  }

  copyBtn.addEventListener('click', doCopy);
  quitBtn.addEventListener('click', quit);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('click', onOverlayClick);
  dialogHeader.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('keydown', onKeyDown, true);
})();
