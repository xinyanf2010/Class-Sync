/* Measure bounding boxes + key computed styles of matching elements in the
   live app (reference) and index.html (replica), then diff them. */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WEB = 'http://localhost:3001';
const API = 'http://localhost:4000';

// [name, refSelector, replicaSelector]
const PROBES = {
  home: [
    ['nav', 'nav', '#page-home nav'],
    ['wordmark', '.wordmark', '#page-home nav span'],
    ['h1', 'h1', '#page-home h1'],
    ['subtitle', '.subtitle', '#page-home main p'],
    ['input', 'input', '#page-home input'],
    ['createBtn', '.btn-primary', '#page-home main button'],
    ['emptyNote', 'main .caption', '#page-home .grid p'],
  ],
  live: [
    ['h1', 'h1', '#page-live h1'],
    ['endBtn', '.btn-danger', '#page-live main > div button'],
    ['segmented', '.segmented', '#page-live main div.inline-flex'],
    ['card1', '.tile', '#page-live main .grid > div'],
    ['badge1', '.badge', '#page-live main .grid span.inline-flex'],
    ['track1', '.track', '#page-live main .grid div.w-20'],
  ],
  login: [
    ['h1', 'h1', '#page-login h1'],
    ['card', '.card', '#page-login div.rounded-card'],
    ['signin', '.btn-primary', '#page-login main button'],
  ],
};

const STYLE_PROPS = ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'padding', 'borderRadius', 'color', 'backgroundColor'];

async function probe(page, url, selectors, token, pick) {
  if (token) {
    await page.evaluateOnNewDocument((t) => localStorage.setItem('classsync_token', t), token);
  }
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  return page.evaluate((selectors, STYLE_PROPS, pick) => {
    const out = {};
    for (const row of selectors) {
      const name = row[0], sel = row[pick];
      const el = document.querySelector(sel);
      if (!el) { out[name] = null; continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out[name] = {
        x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10,
        w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
        ...Object.fromEntries(STYLE_PROPS.map((p) => [p, cs[p]])),
      };
    }
    return out;
  }, selectors, STYLE_PROPS, pick);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher@classsync.demo', password: 'demo1234' }),
  });
  const { token } = await res.json();

  const refHome = await probe(page, `${WEB}/`, PROBES.home, token, 1);
  const refLive = await probe(page, `${WEB}/live/123456`, PROBES.live, token, 1);

  // fresh page without token interceptor for replica + login ref
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const refLogin = await probe(page2, `${WEB}/login`, PROBES.login, null, 1);

  const file = 'file://' + path.join(__dirname, '..', 'index.html');
  const repHome = await probe(page2, file + '#page-home', PROBES.home, null, 2);
  const repLive = await probe(page2, file + '#page-live', PROBES.live, null, 2);
  const repLogin = await probe(page2, file + '#page-login', PROBES.login, null, 2);

  const diff = (label, ref, rep) => {
    console.log(`\n=== ${label} ===`);
    for (const key of Object.keys(ref)) {
      const a = ref[key], b = rep[key];
      if (!a || !b) { console.log(`  ${key}: MISSING ${!a ? 'ref' : 'rep'}`); continue; }
      const msgs = [];
      // y differs by design: replica stacks all pages in one document
      for (const p of ['x', 'w', 'h']) {
        const d = Math.abs(a[p] - b[p]);
        if (d > 3) msgs.push(`${p}: ref=${a[p]} rep=${b[p]} (Δ${d.toFixed(1)})`);
      }
      for (const p of STYLE_PROPS) {
        if (a[p] !== b[p]) msgs.push(`${p}: ref=${a[p]} rep=${b[p]}`);
      }
      console.log(`  ${key}: ${msgs.length ? msgs.join(' | ') : 'OK'}`);
    }
  };

  diff('HOME', refHome, repHome);
  diff('LIVE', refLive, repLive);
  diff('LOGIN', refLogin, repLogin);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
