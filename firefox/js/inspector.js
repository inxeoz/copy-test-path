var CTP = CTP || {};

CTP.inspector = {
  _enabled: false,
  _tooltip: null,
  _tooltipContent: null,
  _indicator: null,
  _currentEl: null,
  _onHover: null,
  _onClick: null,
  _onKeyDown: null,

  toggle(force) {
    const enable = force !== undefined ? force : !this._enabled;
    this._enabled = enable;
    if (enable) {
      this._onHover = e => this._onHoverHandler(e);
      this._onClick = e => this._onClickHandler(e);
      this._onKeyDown = e => { if (e.key === 'Escape') this.toggle(false); };
      this._createTooltip();
      this._createIndicator();
      document.addEventListener('mousemove', this._onHover, { passive: true });
      document.addEventListener('click', this._onClick, true);
      document.addEventListener('keydown', this._onKeyDown, true);
    } else {
      if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }
      if (this._indicator) { this._indicator.remove(); this._indicator = null; }
      this._tooltipContent = null;
      document.removeEventListener('mousemove', this._onHover);
      document.removeEventListener('click', this._onClick, true);
      document.removeEventListener('keydown', this._onKeyDown, true);
      this._currentEl = null;
      this._onHover = null;
      this._onClick = null;
      this._onKeyDown = null;
    }
  },

  _createTooltip() {
    if (!document.body) return;
    const host = document.createElement('div');
    host.id = 'ctp-tooltip';
    host.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;display:none;';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          display: block;
        }
        .tooltip {
          background: #1E3A5F;
          color: #FFD700;
          font: 12px/1.4 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
          padding: 5px 10px;
          border-radius: 4px;
          max-width: 520px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 2px 10px rgba(0,0,0,0.35);
          direction: rtl;
        }
      </style>
      <div class="tooltip"></div>
    `;
    this._tooltipContent = shadow.querySelector('.tooltip');
    document.body.appendChild(host);
    this._tooltip = host;
  },

  _createIndicator() {
    if (!document.body) return;
    const host = document.createElement('div');
    host.id = 'ctp-indicator';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 2147483647;
          cursor: pointer;
        }
        .indicator {
          background: #1E3A5F;
          color: #FFD700;
          font: 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 8px 16px;
          border-radius: 6px;
          box-shadow: 0 2px 14px rgba(0,0,0,0.35);
        }
      </style>
      <div class="indicator">Inspector — click to copy · click here to exit</div>
    `;
    shadow.querySelector('.indicator').addEventListener('click', () => this.toggle(false));
    document.body.appendChild(host);
    this._indicator = host;
  },

  _onHoverHandler(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === this._currentEl || el.id === 'ctp-indicator' || el.id === 'ctp-tooltip') return;
    this._currentEl = el;
    const path = formatPath(el, CTP.settings.getAll());
    if (!this._tooltipContent) return;
    this._tooltipContent.textContent = path;
    this._tooltip.style.display = 'block';
    let x = e.clientX + 18, y = e.clientY + 18;
    if (x + 520 > innerWidth) x = e.clientX - 530;
    if (y + 30 > innerHeight) y = e.clientY - 40;
    this._tooltip.style.left = x + 'px';
    this._tooltip.style.top = y + 'px';
  },

  _onClickHandler(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id === 'ctp-tooltip' || el.id === 'ctp-indicator') return;
    e.preventDefault();
    e.stopPropagation();
    const path = formatPath(el, CTP.settings.getAll());
    if (!path) return;

    CTP.clipboard.copy(path).then(() => {
      CTP.highlight.apply(el);
      CTP.toast.show('Copied!');
      CTP.log('Inspector copied', path);
      CTP.history.add(path).catch(() => {});
      CTP.broadcast.copied(path);
      this.toggle(false);
    }).catch(() => CTP.toast.show('Clipboard failed', true));
  },
};
