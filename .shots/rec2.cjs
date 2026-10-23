const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const dir = 'D:/LifeNum/.shots/video';
  fs.rmSync(dir, { recursive: true, force: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-TW', recordVideo: { dir, size: { width: 430, height: 932 } } });
  const page = await ctx.newPage();
  const w = (ms) => page.waitForTimeout(ms);
  const log = [];
  const setV = async (sel, val) => page.evaluate(([s, v]) => {
    const el = document.querySelector(s); if (!el) return false;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    el.focus(); set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur();
    return true;
  }, [sel, val]);
  const clickText = async (txt, scope) => page.evaluate(([t, sc]) => {
    const root = sc ? document.querySelector(sc) : document;
    const b = Array.from(root.querySelectorAll('button')).find(e => (e.innerText || '').trim().includes(t));
    if (b) { b.click(); return true; } return false;
  }, [txt, scope]);

  await page.goto('https://lifenum.pages.dev/', { waitUntil: 'domcontentloaded' });
  await w(3500);
  await setV('input[type=text]', 'Apple Review');
  await w(800);
  await setV('input[type=date]', '1990-01-01');
  await w(1200);
  await clickText('開始探索');
  await w(3500);
  log.push('home:' + (await page.evaluate(() => document.body.innerText.slice(0, 40))));

  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 720; window.scrollTo(0, 720); });
  await w(3000);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); });
  await w(1200);

  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText || '').includes('我的')); if (b) b.click(); });
  await w(2000);
  await clickText('登入 / 註冊');
  await w(2500);
  // register a temp account
  await clickText('註冊', '[role=dialog], .sheet, form');
  await w(1500);
  await page.evaluate(() => {
    const ins = Array.from(document.querySelectorAll('input'));
    const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const em = ins.find(i => i.type === 'email'); const pw = ins.find(i => i.type === 'password'); const nm = ins.filter(i => i.type === 'text'); const dt = ins.find(i => i.type === 'date');
    if (em) set(em, 'review.demo@marlleegroup.com');
    if (pw) set(pw, 'LifeNum2026!');
    if (nm.length) set(nm[nm.length - 1], 'Review Demo');
    if (dt) set(dt, '1991-02-03');
  });
  await w(1500);
  await page.screenshot({ path: 'D:/LifeNum/.shots/v_reg.png' });
  log.push('regform:' + (await page.evaluate(() => document.body.innerText.slice(-200))));
  await w(2000);
  await ctx.close(); await browser.close();
  console.log(JSON.stringify(log));
  console.log(fs.readdirSync(dir));
})();
