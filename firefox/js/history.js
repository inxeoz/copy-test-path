var CTP = CTP || {};

const FORMAT_KEYS = {
  'playwright-path': 'formatPlaywrightPath',
  'css-selector': 'formatCssSelector',
  'xpath': 'formatXPath',
  'test-snippet': 'formatTestSnippet',
};

CTP.history = {
  async add(path) {
    const data = await browser.storage.local.get({ history: [] });
    const format = CTP.settings.get('format');
    data.history.unshift({
      path,
      format,
      formatKey: FORMAT_KEYS[format] || 'formatPlaywrightPath',
      ts: Date.now(),
    });
    if (data.history.length > 20) data.history.length = 20;
    await browser.storage.local.set({ history: data.history });
  },
};
