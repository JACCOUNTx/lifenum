const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const c = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-TW' });
  const p = await c.newPage();
  await p.goto('https://lifenum.pages.dev/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(e => (e.innerText||'').includes('開始探索')); if (x) x.click(); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText||'').includes('我的')); if (x) x.click(); });
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(e => (e.innerText||'').includes('登入')); if (x) x.click(); });
  await p.waitForTimeout(2500);
  const form = await p.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, ph: i.placeholder, aria: i.getAttribute('aria-label'), name: i.name }));
    const btns = Array.from(document.querySelectorAll('button')).map(x => x.innerText.trim()).filter(Boolean);
    const labels = Array.from(document.querySelectorAll('label')).map(l => l.innerText.trim());
    return { inputs, btns, labels };
  });
  console.log(JSON.stringify(form));
  await b.close();
})();
