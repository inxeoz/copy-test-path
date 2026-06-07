const i18n = (typeof browser !== 'undefined' && browser.i18n ? browser : chrome).i18n;

export function msg(key, substitutions) {
  return i18n.getMessage(key, substitutions) || key;
}

export function render() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const text = msg(el.getAttribute('data-i18n'));
    if (text) el.textContent = text;
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    const text = msg(el.getAttribute('data-i18n-title'));
    if (text) el.setAttribute('title', text);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const text = msg(el.getAttribute('data-i18n-placeholder'));
    if (text) el.setAttribute('placeholder', text);
  }
}
