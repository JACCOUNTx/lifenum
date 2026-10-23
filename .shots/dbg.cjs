const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'zh-TW' });
  const page = await ctx.newPage();
  await page.goto('https://lifenum.pages.dev/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => (b.innerText||'').trim()).slice(0,15));
  const navs = await page.evaluate(() => Array.from(document.querySelectorAll('nav')).map(n => n.innerText.replace(/\n+/g,'|')));
  console.log(JSON.stringify({ btns, navs }));
  await browser.close();
})();
