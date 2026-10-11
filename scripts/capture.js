/* Capture screenshots of the real Next.js app (reference) or the static
   index.html (replica) using system Chrome via puppeteer-core.
   Usage:
     node scripts/capture.js reference   # screenshots of the live app
     node scripts/capture.js replica     # screenshots of index.html
*/
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WEB = 'http://localhost:3001';
const API = 'http://localhost:4000';
const OUT = path.join(__dirname, '..', 'shots');

const mode = process.argv[2] || 'reference';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  if (mode === 'reference') {
    // login page (logged out)
    await page.goto(`${WEB}/login`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(OUT, 'ref-login.png') });

    // get a teacher token + demo class id from the API
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@classsync.demo', password: 'demo1234' }),
    });
    const { token } = await res.json();
    await page.evaluateOnNewDocument((t) => {
      localStorage.setItem('classsync_token', t);
    }, token);

    // home (class list)
    await page.goto(`${WEB}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(OUT, 'ref-home.png') });

    // live dashboard (demo class, pre-seeded with students + live session)
    await page.goto(`${WEB}/live/123456`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUT, 'ref-live.png'), fullPage: true });
  } else {
    const file = 'file://' + path.join(__dirname, '..', 'index.html');
    await page.goto(file, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, 'replica.png'), fullPage: true });

    // section-level shots to compare 1:1 against the ref pages
    const sections = { home: '#page-home', live: '#page-live', login: '#page-login' };
    for (const [name, sel] of Object.entries(sections)) {
      const el = await page.$(sel);
      if (el) await el.screenshot({ path: path.join(OUT, `replica-${name}.png`) });
    }
  }

  await browser.close();
  console.log('done:', mode);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
