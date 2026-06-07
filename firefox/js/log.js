var CTP = CTP || {};

CTP.log = function(label, text) {
  const s = text == null ? '' : String(text);
  const preview = s.length > 120 ? s.slice(0, 120) + '\u2026' : s;
  console.log(
    '%ccopy-test-path%c ' + label + ': ' + preview,
    'background:#1E3A5F;color:#FFD700;padding:2px 6px;border-radius:4px;font-weight:700;',
    'color:#0f172a;'
  );
};
