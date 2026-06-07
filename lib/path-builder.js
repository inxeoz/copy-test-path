function siblingIndex(el) {
  const p = el.parentElement;
  if (!p) return 1;
  const siblings = Array.from(p.children).filter(c => c.tagName === el.tagName);
  return siblings.indexOf(el) + 1;
}

function testContext(el) {
  const ctx = el.closest('[data-test-context]');
  return ctx ? ctx.getAttribute('data-test-context') : '';
}

function shouldSkip(el, settings) {
  return settings.skipTestignore && el.hasAttribute('data-testignore');
}

function walkUp(el, segmentFn, settings) {
  const segs = [];
  let cur = el;
  let depth = 0;
  while (cur && cur !== document.documentElement && cur !== document.body && depth < 25) {
    if (shouldSkip(cur, settings)) { cur = cur.parentElement; depth++; continue; }
    if (settings.shadowDom) {
      const parent = cur.parentElement;
      if (!parent) {
        const root = cur.getRootNode ? cur.getRootNode() : null;
        if (root instanceof ShadowRoot && root.host && cur !== root.host) {
          segs.unshift(segmentFn(cur));
          segs.unshift('{shadow}');
          cur = root.host;
          depth += 2;
          continue;
        }
      }
    }
    segs.unshift(segmentFn(cur));
    cur = cur.parentElement;
    depth++;
  }
  if (depth >= 25) segs.unshift('...');

  const limit = parseInt(settings.pathDepth, 10);
  if (!isNaN(limit) && limit > 0 && segs.length > limit) {
    return ['…', ...segs.slice(-limit)];
  }
  return segs;
}

function segPlaywright(el) {
  const tid = el.getAttribute('data-testid');
  if (tid) {
    const label = el.getAttribute('data-testlabel');
    return label ? `${tid}[data-testlabel="${label}"]` : tid;
  }
  return `${el.tagName.toLowerCase()}[${siblingIndex(el)}]`;
}

function segCss(el) {
  const tid = el.getAttribute('data-testid');
  if (tid) return `[data-testid="${tid}"]`;
  if (el.id) return `#${el.id}`;
  return `${el.tagName.toLowerCase()}:nth-of-type(${siblingIndex(el)})`;
}

function segXPath(el) {
  const tid = el.getAttribute('data-testid');
  if (tid) return `*[@data-testid="${tid}"]`;
  return `${el.tagName.toLowerCase()}[${siblingIndex(el)}]`;
}

function buildPlaywrightPath(el, settings) {
  const ctx = testContext(el);
  const p = walkUp(el, segPlaywright, settings).join(' > ');
  return ctx ? `${ctx} | ${p}` : p;
}

function buildCssSelector(el, settings) {
  return walkUp(el, segCss, settings).join(' > ');
}

function buildXPath(el, settings) {
  return '/' + walkUp(el, segXPath, settings).join('/');
}

function buildTestSnippet(el, settings) {
  const path = buildPlaywrightPath(el, settings);
  const tag = el.tagName.toLowerCase();
  const tid = el.getAttribute('data-testid');
  let placeholder = '';
  if (tag === 'input' || tag === 'textarea') placeholder = ".fill('')";
  else if (tag === 'select') placeholder = ".selectOption('')";
  else if (el.isContentEditable) placeholder = ".fill('')";
  if (tid) return `await page.getByTestId('${tid}')${placeholder};`;
  return `await page.locator('${path}')${placeholder};`;
}

function formatPath(el, settings) {
  switch (settings.format) {
    case 'css-selector': return buildCssSelector(el, settings);
    case 'xpath': return buildXPath(el, settings);
    case 'test-snippet': return buildTestSnippet(el, settings);
    default: return buildPlaywrightPath(el, settings);
  }
}

function getAllTestIds() {
  const map = {};
  document.querySelectorAll('[data-testid]').forEach(el => {
    const id = el.getAttribute('data-testid');
    if (id) map[id] = (map[id] || 0) + 1;
  });
  return map;
}

function formatAllTestIds(map) {
  const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) return '(no data-testid attributes found on this page)';
  return entries.map(([id, c]) => c > 1 ? id + ' (\u00d7' + c + ')' : id).join('\n');
}
