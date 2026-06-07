let lastRightClicked = null;

(async () => {
  await CTP.settings.init();

  document.addEventListener('contextmenu', e => {
    lastRightClicked = (e.target && e.target.nodeType === Node.ELEMENT_NODE) ? e.target : document.activeElement;
  }, true);

  browser.runtime.onMessage.addListener((msg) => {
    const action = msg.action;

    if (action === 'get-nav-path' || action === 'get-url-path') {
      if (!lastRightClicked) return Promise.resolve({ error: 'no element' });
      const el = lastRightClicked;
      lastRightClicked = null;
      let text = formatPath(el, CTP.settings.getAll());
      if (action === 'get-url-path') text = location.href + ' | ' + text;
      return CTP.clipboard.copy(text).then(() => {
        if (CTP.settings.get('highlight')) CTP.highlight.apply(el);
        CTP.toast.show('Copied!');
        CTP.log('Copied', text);
        CTP.history.add(text).catch(() => {});
        CTP.broadcast.copied(text);
        return { ok: true };
      }).catch(() => {
        CTP.toast.show('Clipboard failed', true);
        return { ok: false };
      });
    }

    if (action === 'get-all-testids') {
      const map = getAllTestIds();
      const text = formatAllTestIds(map);
      return CTP.clipboard.copy(text).then(() => {
        const n = Object.keys(map).length;
        CTP.toast.show('Copied ' + n + ' testid' + (n !== 1 ? 's' : ''));
        CTP.log('Copied ' + n + ' testid' + (n !== 1 ? 's' : ''), text.slice(0, 80));
        return { ok: true };
      }).catch(() => {
        CTP.toast.show('Clipboard failed', true);
        return { ok: false };
      });
    }

    if (action === 'toggle-inspector') {
      CTP.inspector.toggle();
      return Promise.resolve({});
    }
  });
})();
