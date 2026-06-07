var CTP = CTP || {};

CTP.settings = {
  _data: {
    format: 'playwright-path',
    highlight: true,
    shadowDom: true,
    skipTestignore: true,
    pathDepth: 'all',
  },

  async init() {
    const stored = await browser.storage.sync.get(this._data);
    Object.assign(this._data, stored);
    browser.storage.onChanged.addListener(changes => {
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in this._data) this._data[key] = newValue;
      }
    });
  },

  getAll() {
    return { ...this._data };
  },

  get(key) {
    return this._data[key];
  },
};
