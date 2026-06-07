var CTP = CTP || {};

CTP.highlight = {
  _timer: null,

  apply(el) {
    if (this._timer) clearTimeout(this._timer);
    const orig = {
      outline: el.style.outline,
      outlineOffset: el.style.outlineOffset,
      background: el.style.background,
      transition: el.style.transition,
    };
    Object.assign(el.style, {
      outline: '2px solid #FFD700',
      outlineOffset: '2px',
      background: 'rgba(255,215,0,0.12)',
      transition: 'outline 0.3s, background 0.3s',
    });
    this._timer = setTimeout(() => {
      Object.assign(el.style, orig);
      this._timer = null;
    }, 1200);
  },
};
