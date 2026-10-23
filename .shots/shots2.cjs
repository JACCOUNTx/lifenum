const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'zh-TW' });
  const page = await ctx.newPage();
  await page.goto('https://lifenum.pages.dev/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('nav button, button')).find(e => (e.innerText || '').includes('我的'));
    if (b) { b.click(); return true; } return false;
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'D:/LifeNum/.shots/s3.png' });
  console.log('clicked', clicked);
  await browser.close();
})();
