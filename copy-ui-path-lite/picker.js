(function () {
  console.log('[copy-ui-path-lite] picker.js loaded');
  if (document.getElementById('ctp-picker-root')) {
    console.log('[copy-ui-path-lite] picker already active, skipping');
    return;
  }

  // Inject shake animation + close animation
  var injectedStyle = document.createElement('style');
  injectedStyle.textContent = '@keyframes ctp-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}@keyframes ctp-fadeOut{from{opacity:1}to{opacity:0;transform:translateY(-8px)}}';
  document.head.appendChild(injectedStyle);

  // ── Path building ──────────────────────────────────────────────────

  var PART = {
    URL:      'url',
    SEP:      'sep',
    PATH:     'path',
    PATH_TID: 'path_tid',
    SEP_PATH: 'sep_path',
    BR_OPEN:  'br_open',
    CORNER:   'corner',
    Z_INDEX:  'zindex',
    BR_CLOSE: 'br_close',
    CTX_OPEN: 'ctx_open',
    CTX_KEY:  'ctx_key',
    CTX_STR:  'ctx_str',
    CTX_FLAG: 'ctx_flag',
    CTX_CLOSE:'ctx_close',
  };

  function PathBuilder() {
    this.list = [];
  }
  PathBuilder.prototype.add = function(type, value) {
    this.list.push({ type: type, value: value });
    return this;
  };
  PathBuilder.prototype.toText = function() {
    return this.list.map(function(s) { return s.value; }).join('');
  };
  PathBuilder.prototype.appendTo = function(parent) {
    for (var i = 0; i < this.list.length; i++) {
      var s = this.list[i];
      var span = document.createElement('span');
      span.className = 'p-' + s.type;
      span.textContent = s.value;
      parent.appendChild(span);
    }
  };

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

  var TEST_ATTRS = [
    'data-testid', 'data-test', 'data-cy', 'data-qa',
    'data-automation-id', 'data-automation', 'data-e2e',
    'data-test-id', 'data-component', 'data-element'
  ];

  function getTestId(el) {
    for (var i = 0; i < TEST_ATTRS.length; i++) {
      var val = el.getAttribute(TEST_ATTRS[i]);
      if (val) return { name: TEST_ATTRS[i], value: val };
    }
    return null;
  }

  function getContext(el) {
    if (getTestId(el)) return '';
    if (el.id) return '(#' + el.id + ')';
    if (el.className && typeof el.className === 'string' && el.className.trim()) {
      return '(' + el.className.trim().split(/\s+/)[0] + ')';
    }
    return '';
  }

  function segPlaywright(el) {
    var tid = getTestId(el);
    if (tid) {
      const label = el.getAttribute('data-testlabel');
      return label ? tid.value + '[data-testlabel="' + label + '"]' : tid.value;
    }
    var ctx = getContext(el);
    return el.tagName.toLowerCase() + '[' + siblingIndex(el) + ']' + ctx;
  }

  function segXPath(el) {
    var tid = getTestId(el);
    if (tid) return tid.value;
    var ctx = getContext(el);
    return el.tagName.toLowerCase() + '[' + siblingIndex(el) + ']' + ctx;
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

  function segCSS(el) {
    var tid = getTestId(el);
    if (tid) return tid.value;
    if (el.id) return '#' + CSS.escape(el.id);
    var tag = el.tagName.toLowerCase();
    var classes = [];
    if (el.className && typeof el.className === 'string') {
      classes = el.className.trim().split(/\s+/).filter(Boolean).map(function(c) { return '.' + CSS.escape(c); });
    }
    if (classes.length) return tag + classes.join('') + ':nth-child(' + siblingIndex(el) + ')';
    return tag + ':nth-child(' + siblingIndex(el) + ')';
  }

  function buildCSSSelector(el) {
    return walkUp(el, segCSS).join(' > ');
  }

  function formatPath(el) {
    var tid = getTestId(el);
    if (tid) {
      console.log('[copy-ui-path-lite] element has ' + tid.name + ':', tid.value, '-> using Playwright path');
      return buildPlaywrightPath(el);
    }
    console.log('[copy-ui-path-lite] no test id found -> using XPath');
    return buildXPath(el);
  }

  function formatPreview(el) {
    return buildXPath(el);
  }

  function buildContextParts(el) {
    var segs = [];
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text) {
      text = text.length > 40 ? text.slice(0, 37) + '...' : text;
      segs.push({ type: PART.CTX_KEY, value: 'text' });
      segs.push({ type: PART.CTX_STR, value: '="' + text + '"' });
    }
    var role = el.getAttribute('role');
    if (role) {
      segs.push({ type: PART.CTX_KEY, value: ' role' });
      segs.push({ type: PART.CTX_STR, value: '="' + role + '"' });
    }
    if (el.disabled) segs.push({ type: PART.CTX_FLAG, value: ' disabled' });
    if (el.checked)  segs.push({ type: PART.CTX_FLAG, value: ' checked' });
    if (el.selected) segs.push({ type: PART.CTX_FLAG, value: ' selected' });
    var ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      segs.push({ type: PART.CTX_KEY, value: ' aria-label' });
      segs.push({ type: PART.CTX_STR, value: '="' + ariaLabel + '"' });
    }
    var tag = el.tagName.toLowerCase();
    if (tag === 'a') {
      var href = el.getAttribute('href');
      if (href) {
        href = href.length > 60 ? href.slice(0, 57) + '...' : href;
        segs.push({ type: PART.CTX_KEY, value: ' href' });
        segs.push({ type: PART.CTX_STR, value: '="' + href + '"' });
      }
    }
    if (tag === 'img') {
      var alt = el.getAttribute('alt');
      if (alt) {
        segs.push({ type: PART.CTX_KEY, value: ' alt' });
        segs.push({ type: PART.CTX_STR, value: '="' + alt + '"' });
      }
    }
    if (el.type) {
      segs.push({ type: PART.CTX_KEY, value: ' type' });
      segs.push({ type: PART.CTX_STR, value: '="' + el.type + '"' });
    }
    var name = el.getAttribute('name');
    if (name) {
      segs.push({ type: PART.CTX_KEY, value: ' name' });
      segs.push({ type: PART.CTX_STR, value: '="' + name + '"' });
    }
    var placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      segs.push({ type: PART.CTX_KEY, value: ' placeholder' });
      segs.push({ type: PART.CTX_STR, value: '="' + placeholder + '"' });
    }
    var r = el.getBoundingClientRect();
    var sx = r.left + window.scrollX;
    var sy = r.top + window.scrollY;
    if (sx !== 0 || sy !== 0) {
      segs.push({ type: PART.CTX_KEY, value: ' scroll' });
      segs.push({ type: PART.CTX_STR, value: '="' + Math.round(sx) + ',' + Math.round(sy) + '"' });
    }
    segs.push({ type: PART.CTX_KEY, value: ' area' });
    segs.push({ type: PART.CTX_STR, value: '="' + Math.round(r.width) + 'x' + Math.round(r.height) + '"' });
    return segs;
  }

  function splitPathFull(selectorPath, el) {
    var isXPath = selectorPath.charAt(0) === '/';
    var sep = isXPath ? '/' : ' > ';
    var raw = selectorPath.split(sep);
    var result = [];
    var lastHasTid = !!getTestId(el);
    var start = (isXPath && raw[0] === '') ? 1 : 0;
    if (isXPath && raw[0] === '') result.push({ type: PART.PATH, value: '' });
    for (var i = start; i < raw.length; i++) {
      if (i > start) result.push({ type: PART.SEP_PATH, value: sep });
      result.push({ type: (i === raw.length - 1 && lastHasTid) ? PART.PATH_TID : PART.PATH, value: raw[i] });
    }
    return result;
  }

  function buildPathData(el, selectorPath, zVal) {
    var pb = new PathBuilder();
    var rect = el.getBoundingClientRect();

    pb.add(PART.URL, location.href);
    pb.add(PART.SEP, ' | ');
    splitPathFull(selectorPath, el).forEach(function(s) { pb.add(s.type, s.value); });

    pb.add(PART.BR_OPEN, ' [');
    pb.add(PART.CORNER, 'tl=[' + Math.round(rect.left) + ',' + Math.round(rect.top) + '], tr=[' + Math.round(rect.right) + ',' + Math.round(rect.top) + '], bl=[' + Math.round(rect.left) + ',' + Math.round(rect.bottom) + '], br=[' + Math.round(rect.right) + ',' + Math.round(rect.bottom) + ']');
    if (zVal) pb.add(PART.Z_INDEX, ' z-index=' + zVal);
    pb.add(PART.BR_CLOSE, ']');

    var ctx = buildContextParts(el);
    if (ctx.length) {
      pb.add(PART.CTX_OPEN, ' [');
      ctx.forEach(function(p) { pb.add(p.type, p.value); });
      pb.add(PART.CTX_CLOSE, ']');
    }

    return pb;
  }

  function getSelectorPath(el, mode) {
    if (mode === 'xpath') return buildXPath(el);
    if (mode === 'pw') return buildPlaywrightPath(el);
    if (mode === 'css') return buildCSSSelector(el);
    return formatPath(el);
  }

  function getPreviewPath(el, mode) {
    if (mode === 'xpath' || mode === 'pw' || mode === 'css') return getSelectorPath(el, mode);
    return formatPreview(el);
  }

  function calcTestidPercent(el) {
    var total = 0;
    var withId = 0;
    var cur = el;
    while (cur && cur !== document.documentElement && cur !== document.body) {
      if (shouldSkip(cur)) { cur = cur.parentElement; continue; }
      total++;
      if (getTestId(cur) || cur.id) withId++;
      cur = cur.parentElement;
    }
    if (total === 0) return 0;
    return Math.round((withId / total) * 100);
  }

  // ── Shadow DOM element detection ───────────────────────────────────

  function elFromPoint(x, y) {
    host.style.setProperty('display', 'none', 'important');
    hlEl.style.setProperty('display', 'none', 'important');
    var el = document.elementFromPoint(x, y);
    host.style.removeProperty('display');
    if (currentEl) hlEl.style.setProperty('display', 'block', 'important');
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
    hideCornerLabels();
    centerLabel.style.display = 'none';
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
  var tpl = document.createElement('template');
  tpl.innerHTML = '<style>*,*::before,*::after{box-sizing:border-box}#overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;cursor:crosshair;pointer-events:auto}#dialog{position:fixed;bottom:20px;right:20px;min-width:190px;max-width:420px;background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.25),0 1px 4px rgba(0,0,0,.1);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:13px;color:#1e293b;pointer-events:auto;z-index:1;transition:width .12s ease}#dialog.closing{animation:ctp-fadeOut .25s ease forwards}#dialog-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#1E3A5F;color:#FFD700;font-weight:600;font-size:13px;cursor:move;user-select:none;white-space:nowrap}#el-info{font-size:11px;font-weight:400;opacity:.85;overflow:hidden;text-overflow:ellipsis;margin:0 8px;flex:1;text-align:center;white-space:nowrap}#quitBtn{background:none;border:none;color:#FFD700;font-size:20px;cursor:pointer;padding:0 4px;line-height:1;opacity:.7;flex-shrink:0}#quitBtn:hover{opacity:1}#path-display{padding:12px 14px;font-family:SF Mono,Cascadia Code,Fira Code,Menlo,Consolas,monospace;font-size:12px;color:#1e293b;background:#f8fafc;border-bottom:1px solid #e2e8f0;word-break:break-all;line-height:1.5;min-height:40px;max-height:120px;overflow-y:auto;white-space:pre-wrap}#dialog-actions{padding:10px 14px;display:flex;justify-content:flex-end;gap:8px}.primary{padding:7px 18px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;background:#1E3A5F;color:#FFD700;transition:background .15s}.primary:hover{background:#2a5070}.primary:active{background:#16304a}.primary.copied{background:#22c55e}#format-select{font-size:11px;padding:3px 6px;border:1px solid #e2e8f0;border-radius:4px;background:#fff;color:#1e293b;font-family:inherit;cursor:pointer;outline:none}#overlay.frozen{cursor:default}#dialog.frozen{border:2px solid #22c55e}@media(prefers-color-scheme:dark){#dialog{background:#1e293b;color:#e2e8f0}#path-display{background:#0f172a;color:#e2e8f0;border-bottom-color:#334155}.primary{background:#4A90D9;color:#fff}.primary:hover{background:#3b78c0}.primary:active{background:#2d5fa0}#format-select{background:#0f172a;color:#e2e8f0;border-color:#334155}#dialog.frozen{border-color:#22c55e}}.p-url{color:#1d4ed8}.p-sep{color:#475569}.p-corner{color:#92400e}.p-zindex{color:#6d28d9}.p-ctx_key{color:#047857}.p-ctx_str{color:#065f46}.p-ctx_flag{color:#9f1239}.p-path_tid{color:#991b1b}.p-sep_path{color:#15803d}.p-br_open,.p-br_close{color:#92400e}.p-ctx_open,.p-ctx_close{color:#047857}@media(prefers-color-scheme:dark){.p-url{color:#93c5fd}.p-sep{color:#e2e8f0}.p-corner{color:#fde68a}.p-zindex{color:#ddd6fe}.p-ctx_key{color:#6ee7b7}.p-ctx_str{color:#a7f3d0}.p-ctx_flag{color:#fecdd3}.p-path_tid{color:#fca5a5}.p-sep_path{color:#86efac}.p-br_open,.p-br_close{color:#fde68a}.p-ctx_open,.p-ctx_close{color:#6ee7b7}}</style><svg id="overlay" xmlns="http://www.w3.org/2000/svg"><path id="ocean" fill="rgba(0,0,0,0.4)" fill-rule="evenodd" d=""/><path id="island" fill="rgba(255,215,0,0.2)" stroke="#FFD700" stroke-width="2" d=""/></svg><div id="dialog"><div id="dialog-header"><span>Element picker</span><span id="el-info"></span><button id="quitBtn" title="Quit">&times;</button></div><div id="path-display">Hover over an element...</div><div id="dialog-actions"><select id="format-select"><option value="context">Context</option><option value="xpath">XPath</option><option value="css">CSS</option><option value="pw">Playwright</option></select><button id="copyBtn" class="primary">Copy path</button></div></div>';
  shadow.appendChild(tpl.content.cloneNode(true));

  document.documentElement.appendChild(host);

  var overlay = shadow.querySelector('#overlay');
  var ocean = shadow.querySelector('#ocean');
  var island = shadow.querySelector('#island');
  var dialog = shadow.querySelector('#dialog');
  var dialogHeader = shadow.querySelector('#dialog-header');
  var pathDisplay = shadow.querySelector('#path-display');
  var elInfo = shadow.querySelector('#el-info');
  var formatSelect = shadow.querySelector('#format-select');
  var copyBtn = shadow.querySelector('#copyBtn');
  var quitBtn = shadow.querySelector('#quitBtn');
  var formatMode = 'context';
  var frozen = false;
  formatSelect.addEventListener('change', function() { formatMode = this.value; });

  // Highlight overlay
  var hlEl = document.createElement('div');
  hlEl.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #4A90D9;z-index:2147483646;display:none;';
  document.body.appendChild(hlEl);

  // Corner labels
  var cornerLabels = [];
  ['tl', 'tr', 'bl', 'br'].forEach(function(name) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;z-index:2147483646;font:11px/1 SF Mono,Cascadia Code,Fira Code,Menlo,monospace;color:#1E3A5F;background:#FFD700;padding:2px 5px;border-radius:3px;pointer-events:none;white-space:nowrap;display:none;';
    document.body.appendChild(el);
    cornerLabels.push(el);
  });
  var cornerTl = cornerLabels[0];
  var cornerTr = cornerLabels[1];
  var cornerBl = cornerLabels[2];
  var cornerBr = cornerLabels[3];

  // Center z-index label
  var centerLabel = document.createElement('div');
  centerLabel.style.cssText = 'position:fixed;z-index:2147483646;font:12px/1 SF Mono,Cascadia Code,Fira Code,Menlo,monospace;color:#1E3A5F;background:#FFD700;padding:2px 6px;border-radius:4px;pointer-events:none;display:none;';
  document.body.appendChild(centerLabel);

  var currentEl = null;
  var currentPath = '';
  var dragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var rafPending = false;
  var lastX = 0;
  var lastY = 0;

  var SIZE_THRESHOLD_W = 100;
  var SIZE_THRESHOLD_H = 40;

  function updateCornerLabels(rect) {
    if (rect.width < SIZE_THRESHOLD_W || rect.height < SIZE_THRESHOLD_H) {
      hideCornerLabels();
      return;
    }
    var tlX = Math.round(rect.left);
    var tlY = Math.round(rect.top);
    var trX = Math.round(rect.right);
    var trY = Math.round(rect.top);
    var blX = Math.round(rect.left);
    var blY = Math.round(rect.bottom);
    var brX = Math.round(rect.right);
    var brY = Math.round(rect.bottom);

    cornerTl.textContent = 'tl[' + tlX + ',' + tlY + ']';
    cornerTl.style.left = Math.max(2, rect.left - 4) + 'px';
    cornerTl.style.top = Math.max(2, rect.top - 22) + 'px';
    cornerTl.style.display = 'block';

    cornerTr.textContent = 'tr[' + trX + ',' + trY + ']';
    cornerTr.style.right = Math.max(2, window.innerWidth - rect.right + 4) + 'px';
    cornerTr.style.top = Math.max(2, rect.top - 22) + 'px';
    cornerTr.style.display = 'block';

    cornerBl.textContent = 'bl[' + blX + ',' + blY + ']';
    cornerBl.style.left = Math.max(2, rect.left - 4) + 'px';
    cornerBl.style.top = (rect.bottom + 4) + 'px';
    cornerBl.style.display = 'block';

    cornerBr.textContent = 'br[' + brX + ',' + brY + ']';
    cornerBr.style.right = Math.max(2, window.innerWidth - rect.right + 4) + 'px';
    cornerBr.style.top = (rect.bottom + 4) + 'px';
    cornerBr.style.display = 'block';
  }

  function hideCornerLabels() {
    cornerTl.style.display = 'none';
    cornerTr.style.display = 'none';
    cornerBl.style.display = 'none';
    cornerBr.style.display = 'none';
  }

  function updateCenterLabel(rect, zVal) {
    if (!zVal || rect.width < SIZE_THRESHOLD_W || rect.height < SIZE_THRESHOLD_H) {
      centerLabel.style.display = 'none';
      return;
    }
    centerLabel.textContent = 'z: ' + zVal;
    centerLabel.style.left = (rect.left + rect.width / 2) + 'px';
    centerLabel.style.top = (rect.top + rect.height / 2 - 10) + 'px';
    centerLabel.style.display = 'block';
  }

  function updateUI(el) {
    if (!el || el === currentEl) return;
    currentEl = el;
    var rect = el.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var zVal = (function() { var z = window.getComputedStyle(el).zIndex; return (z && z !== 'auto') ? z : null; })();

    // SVG spotlight
    ocean.setAttribute('d', 'M0 0h' + vw + 'v' + vh + 'h-' + vw + 'z M' + rect.left + ' ' + rect.top + 'h' + rect.width + 'v' + rect.height + 'h-' + rect.width + 'z');
    island.setAttribute('d', 'M' + rect.left + ' ' + rect.top + 'h' + rect.width + 'v' + rect.height + 'h-' + rect.width + 'z');

    // Blue outline highlight
    hlEl.style.left = rect.left + 'px';
    hlEl.style.top = rect.top + 'px';
    hlEl.style.width = rect.width + 'px';
    hlEl.style.height = rect.height + 'px';
    hlEl.style.display = 'block';

    // Element info in dialog header
    var tag = el.tagName.toLowerCase();
    var id = el.id ? '#' + el.id : '';
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '';
    var tid = getTestId(el);
    var tidStr = tid ? ' [' + tid.name + '=' + tid.value + ']' : '';
    var dim = Math.round(rect.width) + '\u00d7' + Math.round(rect.height);
    elInfo.textContent = tag + id + cls + tidStr + ' ' + dim;

    // Hide crosshair on small elements
    overlay.style.cursor = (rect.width < SIZE_THRESHOLD_W || rect.height < SIZE_THRESHOLD_H) ? 'default' : 'crosshair';

    // Corner labels
    updateCornerLabels(rect);

    // Center z-index label
    updateCenterLabel(rect, zVal);

    // Path display
    var pb = buildPathData(el, getPreviewPath(el, formatMode), zVal);
    currentPath = pb.toText();
    pathDisplay.textContent = '';
    pb.appendTo(pathDisplay);
    if (!dragging) {
      var w = Math.min(420, Math.max(190, Math.ceil(currentPath.length * 7.5) + 56));
      dialog.style.width = w + 'px';
    }
  }

  function doCopy(stayOpen) {
    if (!currentPath) return;
    var zVal = (function() { var z = window.getComputedStyle(currentEl).zIndex; return (z && z !== 'auto') ? z : null; })();
    var selector = getSelectorPath(currentEl, formatMode);
    var isContextMode = (formatMode === 'auto' || formatMode === 'context');
    var copyText = isContextMode ? buildPathData(currentEl, selector, zVal).toText() : selector;
    var pct = calcTestidPercent(currentEl);
    console.log('[copy-ui-path-lite] ──────────────────────────────────────');
    console.log('[copy-ui-path-lite] COPIED TO CLIPBOARD:');
    console.log('[copy-ui-path-lite]', copyText);
    console.log('[copy-ui-path-lite] testid coverage:', pct + '%');
    console.log('[copy-ui-path-lite] ──────────────────────────────────────');
    if (!stayOpen) hidePicker();
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    copyToClipboard(copyText).then(function () {
      var preview = copyText.length > 50 ? copyText.slice(0, 47) + '...' : copyText;
      showToast('Copied ' + formatMode + ': ' + preview + '  [' + pct + '%]');
      if (stayOpen) {
        setTimeout(function() { copyBtn.textContent = 'Copy path'; copyBtn.classList.remove('copied'); }, 1200);
      } else {
        dialog.classList.add('closing');
        setTimeout(quit, 300);
      }
    }).catch(function () {
      console.error('[copy-ui-path-lite] clipboard write FAILED');
      showToast('Clipboard failed', true);
      if (!stayOpen) { dialog.classList.add('closing'); setTimeout(quit, 300); }
    });
  }

  function quit() {
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('click', onOverlayClick);
    overlay.removeEventListener('contextmenu', onRightClick);
    dialogHeader.removeEventListener('mousedown', onDragStart);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('keydown', onKeyDown, true);
    injectedStyle.remove();
    hlEl.remove();
    cornerTl.remove();
    cornerTr.remove();
    cornerBl.remove();
    cornerBr.remove();
    centerLabel.remove();
    host.remove();
  }

  function onMouseMove(e) {
    if (dragging || frozen) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      var el = elFromPoint(lastX, lastY);
      if (el) updateUI(el);
    });
  }

  function onOverlayClick(e) {
    if (dragging) return;
    e.preventDefault();
    e.stopPropagation();
    if (frozen) {
      frozen = false;
      dialog.classList.remove('frozen');
      overlay.classList.remove('frozen');
      showToast('Resumed hovering');
      return;
    }
    var el = elFromPoint(e.clientX, e.clientY);
    if (el) {
      updateUI(el);
      doCopy(e.ctrlKey);
    }
  }

  function onRightClick(e) {
    if (frozen) return;
    e.preventDefault();
    e.stopPropagation();
    frozen = true;
    dialog.classList.add('frozen');
    overlay.classList.add('frozen');
    showToast('Frozen — left click to unfreeze');
    var el = elFromPoint(e.clientX, e.clientY);
    if (el) updateUI(el);
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

  copyBtn.addEventListener('click', function(e) { doCopy(e.ctrlKey); });
  quitBtn.addEventListener('click', quit);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('click', onOverlayClick);
  overlay.addEventListener('contextmenu', onRightClick);
  dialogHeader.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('keydown', onKeyDown, true);
})();
