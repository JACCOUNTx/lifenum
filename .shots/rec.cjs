const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const dir = 'D:/LifeNum/.shots/video';
  fs.rmSync(dir, { recursive: true, force: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-TW',
    recordVideo: { dir, size: { width: 430, height: 932 } }
  });
  const page = await ctx.newPage();
  const wait = (ms) => page.waitForTimeout(ms);
  await page.goto('https://lifenum.pages.dev/', { waitUntil: 'domcontentloaded' });
  await wait(3000);
  // onboarding
  await page.evaluate(() => {
    const ins = Array.from(document.querySelectorAll('input'));
    const name = ins.find(i => i.type === 'text');
    const date = ins.find(i => i.type === 'date') || ins[1];
    const setV = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    if (name) setV(name, 'Apple Review');
    if (date) setV(date, '1990-01-01');
  });
  await wait(1500);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(e => (e.innerText||'').includes('開始探索')); if (b) b.click(); });
  await wait(3500);
  // scroll home
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 700; window.scrollTo(0, 700); });
  await wait(2500);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); });
  await wait(1200);
  // account tab
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText||'').includes('我的')); if (b) b.click(); });
  await wait(2000);
  // login
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(e => (e.innerText||'').includes('登入')); if (b) b.click(); });
  await wait(2500);
  await page.evaluate(() => {
    const ins = Array.from(document.querySelectorAll('input'));
    const setV = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const em = ins.find(i => i.type === 'email') || ins[0];
    const pw = ins.find(i => i.type === 'password');
    if (em) setV(em, 'appreview@marlleegroup.com');
    if (pw) setV(pw, 'LifeNum2026!');
  });
  await wait(1500);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(e => /^(登入|Login|Sign in)/.test((e.innerText||'').trim())); if (b) b.click(); });
  await wait(4000);
  await page.screenshot({ path: 'D:/LifeNum/.shots/v_after_login.png' });
  const body = await page.evaluate(() => document.body.innerText.slice(0, 600));
  console.log(JSON.stringify({ body }));
  await wait(2000);
  await ctx.close();
  await browser.close();
  console.log('video files', fs.readdirSync(dir));
})();
