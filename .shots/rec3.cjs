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
  const setAll = async (vals) => page.evaluate((v) => {
    const ins = Array.from(document.querySelectorAll('input'));
    const set = (el, x) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; el.focus(); s.call(el, x); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); };
    const em = ins.find(i => i.type === 'email'); const pw = ins.find(i => i.type === 'password'); const dt = ins.find(i => i.type === 'date'); const tx = ins.filter(i => i.type === 'text');
    if (v.email && em) set(em, v.email);
    if (v.pw && pw) set(pw, v.pw);
    if (v.date && dt) set(dt, v.date);
    if (v.name && tx.length) set(tx[tx.length - 1], v.name);
  }, vals);
  const click = async (t, scope) => page.evaluate(([txt, sc]) => {
    const root = sc ? document.querySelector(sc) : document;
    const b = Array.from(root.querySelectorAll('button')).find(e => (e.innerText || '').trim().includes(txt));
    if (b) { b.click(); return true; } return false;
  }, [t, scope]);

  await page.goto('https://lifenum.pages.dev/', { waitUntil: 'domcontentloaded' });
  await w(4000);
  await setAll({ name: 'Apple Review', date: '1990-01-01' });
  await w(1500);
  await click('開始探索'); await w(4000);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 760; window.scrollTo(0, 760); }); await w(3500);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); }); await w(1500);

  // account + registration
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText || '').includes('我的')); if (b) b.click(); }); await w(2500);
  await click('登入 / 註冊'); await w(2500);
  await click('註冊'); await w(2000);
  await setAll({ email: 'review.demo@marlleegroup.com', pw: 'LifeNum2026!', name: 'Review Demo', date: '1991-02-03' });
  await w(2000);
  await click('建立帳戶'); await w(5000);
  log.push('afterRegister:' + (await page.evaluate(() => document.body.innerText.replace(/\n+/g,'|').slice(0,220))));

  // member content
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText || '').includes('今日')); if (b) b.click(); }); await w(3000);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 800; window.scrollTo(0, 800); }); await w(3000);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 1600; window.scrollTo(0, 1600); }); await w(3000);
  await page.screenshot({ path: 'D:/LifeNum/.shots/v_member.png' });

  // account deletion
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText || '').includes('我的')); if (b) b.click(); }); await w(2500);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 1200; window.scrollTo(0, 1200); }); await w(2000);
  const delOpened = await click('刪除帳戶'); await w(2500);
  const delForm = await page.evaluate(() => { const pw = Array.from(document.querySelectorAll('input[type=password]')); return pw.length; });
  if (delForm) { await setAll({ pw: 'LifeNum2026!' }); }
  await w(1500);
  const confirmed = await click('確認刪除') || await click('刪除帳戶');
  await w(5000);
  log.push('del:' + delOpened + '/' + delForm + '/' + confirmed + '|' + (await page.evaluate(() => document.body.innerText.replace(/\n+/g,'|').slice(0,200))));
  await w(2000);
  await ctx.close(); await browser.close();
  console.log(JSON.stringify(log, null, 1));
  console.log(fs.readdirSync(dir));
})();
