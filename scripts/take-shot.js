const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const filePath = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(filePath, { waitUntil: 'networkidle0' });

  const shotsDir = path.resolve(__dirname, '../shots');
  if (!fs.existsSync(shotsDir)) {
    fs.mkdirSync(shotsDir);
  }

  await page.screenshot({ path: path.join(shotsDir, 'landing-pass2.png'), fullPage: true });
  console.log('Screenshot saved to shots/landing-pass2.png');

  await browser.close();
})();
