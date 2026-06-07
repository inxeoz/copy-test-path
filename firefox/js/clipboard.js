var CTP = CTP || {};

CTP.clipboard = {
  copy(text) {
    return new Promise((resolve, reject) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(resolve).catch(() => this._fallback(text, resolve, reject));
      } else {
        this._fallback(text, resolve, reject);
      }
    });
  },

  _fallback(text, resolve, reject) {
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
  },
};
