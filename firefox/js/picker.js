(function() {
  if (document.getElementById('ctp-picker-root')) return;

  const host = document.createElement('div');
  host.id = 'ctp-picker-root';
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });

  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      #overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        cursor: crosshair;
        pointer-events: auto;
      }
      #dialog {
        position: fixed;
        bottom: 20px; right: 20px;
        min-width: 190px; max-width: 420px;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 4px 24px rgba(0,0,0,.25), 0 1px 4px rgba(0,0,0,.1);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #1e293b;
        pointer-events: auto;
        z-index: 1;
        transition: width 0.12s ease;
      }
      #dialog-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px; background: #1E3A5F; color: #FFD700;
        font-weight: 600; font-size: 13px;
        cursor: move;
        user-select: none;
        white-space: nowrap;
      }
      #quitBtn {
        background: none; border: none; color: #FFD700;
        font-size: 20px; cursor: pointer; padding: 0 4px; line-height: 1; opacity: .7;
        flex-shrink: 0;
      }
      #quitBtn:hover { opacity: 1; }
      #path-display {
        padding: 12px 14px;
        font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', Menlo, Consolas, monospace;
        font-size: 12px; color: #1e293b; background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        word-break: break-all; line-height: 1.5;
        min-height: 40px; max-height: 120px; overflow-y: auto; white-space: pre-wrap;
      }
      #dialog-actions { padding: 10px 14px; display: flex; justify-content: flex-end; gap: 8px; }
      .primary {
        padding: 7px 18px; border: none; border-radius: 6px;
        font-size: 13px; font-weight: 600; cursor: pointer;
        background: #1E3A5F; color: #FFD700; transition: background .15s;
      }
      .primary:hover { background: #2a5070; }
      .primary:active { background: #16304a; }
    </style>
    <svg id="overlay" xmlns="http://www.w3.org/2000/svg">
      <path id="ocean" fill="rgba(0,0,0,0.4)" fill-rule="evenodd" d="" />
      <path id="island" fill="rgba(255,215,0,0.2)" stroke="#FFD700" stroke-width="2" d="" />
    </svg>
    <div id="dialog">
      <div id="dialog-header">
        <span>Element picker</span>
        <button id="quitBtn" title="Quit">&times;</button>
      </div>
      <div id="path-display">Hover over an element…</div>
      <div id="dialog-actions">
        <button id="copyBtn" class="primary">Copy path</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(host);

  const overlay    = shadow.querySelector('#overlay');
  const ocean      = shadow.querySelector('#ocean');
  const island     = shadow.querySelector('#island');
  const dialog     = shadow.querySelector('#dialog');
  const dialogHeader = shadow.querySelector('#dialog-header');
  const pathDisplay = shadow.querySelector('#path-display');
  const copyBtn    = shadow.querySelector('#copyBtn');
  const quitBtn    = shadow.querySelector('#quitBtn');

  let currentEl   = null;
  let currentPath = '';
  let dragging    = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function elFromPoint(x, y) {
    host.style.setProperty('display', 'none', 'important');
    const el = document.elementFromPoint(x, y);
    host.style.removeProperty('display');
    return el;
  }

  function updateHighlight(el) {
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const path = typeof formatPath === 'function' ? formatPath(el, CTP.settings.getAll()) : el.tagName;
    currentEl = el;
    currentPath = path;
    pathDisplay.textContent = path;
    if (!dragging) {
      const w = Math.min(420, Math.max(190, Math.ceil(path.length * 8) + 56));
      dialog.style.width = w + 'px';
    }
    ocean.setAttribute('d', `M0 0h${vw}v${vh}h-${vw}z M${rect.left} ${rect.top}h${rect.width}v${rect.height}h-${rect.width}z`);
    island.setAttribute('d', `M${rect.left} ${rect.top}h${rect.width}v${rect.height}h-${rect.width}z`);
  }

  function doCopy() {
    if (!currentPath) return;
    CTP.clipboard.copy(currentPath).then(() => {
      CTP.history.add(currentPath).catch(() => {});
      CTP.broadcast.copied(currentPath);
      CTP.toast.show('Copied!');
      setTimeout(quit, 500);
    }).catch(() => CTP.toast.show('Clipboard failed', true));
  }

  function quit() {
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('click', onOverlayClick);
    dialogHeader.removeEventListener('mousedown', onDragStart);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('keydown', onKeyDown, true);
    host.remove();
  }

  let throttleTimer = null;
  function onMouseMove(e) {
    if (dragging) return;
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => { throttleTimer = null; }, 30);
    const el = elFromPoint(e.clientX, e.clientY);
    if (!el || el === currentEl) return;
    updateHighlight(el);
  }

  function onOverlayClick(e) {
    if (dragging) return;
    e.preventDefault();
    e.stopPropagation();
    const el = elFromPoint(e.clientX, e.clientY);
    if (!el) return;
    updateHighlight(el);
    doCopy();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') quit();
  }

  function onDragStart(e) {
    if (e.target === quitBtn) return;
    dragging = true;
    const rect = dialog.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    dialog.style.left   = rect.left + 'px';
    dialog.style.top    = rect.top  + 'px';
    dialog.style.right  = 'auto';
    dialog.style.bottom = 'auto';
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!dragging) return;
    const x = Math.max(0, Math.min(e.clientX - dragOffsetX, window.innerWidth  - dialog.offsetWidth));
    const y = Math.max(0, Math.min(e.clientY - dragOffsetY, window.innerHeight - dialog.offsetHeight));
    dialog.style.left = x + 'px';
    dialog.style.top  = y + 'px';
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
