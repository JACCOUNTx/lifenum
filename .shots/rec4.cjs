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
  const setAll = async (v) => page.evaluate((val) => {
    const ins = Array.from(document.querySelectorAll('input'));
    const set = (el, x) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; el.focus(); s.call(el, x); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); };
    const em = ins.find(i => i.type === 'email'); const pw = ins.find(i => i.type === 'password'); const dt = ins.find(i => i.type === 'date'); const tx = ins.filter(i => i.type === 'text');
    if (val.email && em) set(em, val.email);
    if (val.pw && pw) set(pw, val.pw);
    if (val.date && dt) set(dt, val.date);
    if (val.name && tx.length) set(tx[tx.length - 1], val.name);
  }, v);
  const clickExact = async (t) => page.evaluate((txt) => {
    const b = Array.from(document.querySelectorAll('button,a')).find(e => (e.innerText || '').trim() === txt);
    if (b) { b.click(); return true; } return false;
  }, t);
  const clickInc = async (t) => page.evaluate((txt) => {
    const b = Array.from(document.querySelectorAll('button')).find(e => (e.innerText || '').trim().includes(txt));
    if (b) { b.click(); return true; } return false;
  }, t);

  await page.goto('https://lifenum.pages.dev/', { waitUntil: 'domcontentloaded' });
  await w(4000);
  await setAll({ name: 'Apple Review', date: '1990-01-01' }); await w(1500);
  await clickExact('開始探索'); await w(4000);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 760; window.scrollTo(0, 760); }); await w(3500);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); }); await w(1200);

  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText || '').includes('我的')); if (b) b.click(); }); await w(2500);
  await clickExact('登入 / 註冊'); await w(2500);
  await clickExact('註冊'); await w(2000);
  await setAll({ email: 'review.demo@marlleegroup.com', pw: 'LifeNum2026!', name: 'Review Demo', date: '1991-02-03' });
  await w(2000);
  await clickExact('建立帳戶'); await w(6000);
  log.push('reg:' + (await page.evaluate(() => document.body.innerText.replace(/\n+/g, '|').slice(0, 160))));

  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText || '').includes('今日')); if (b) b.click(); }); await w(3000);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 900; window.scrollTo(0, 900); }); await w(3000);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 1800; window.scrollTo(0, 1800); }); await w(3000);
  await page.screenshot({ path: 'D:/LifeNum/.shots/v_member.png' });

  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText || '').includes('我的')); if (b) b.click(); }); await w(2500);
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 2000; window.scrollTo(0, 2000); }); await w(2500);
  await page.screenshot({ path: 'D:/LifeNum/.shots/v_account.png' });
  const delClick = await clickExact('刪除帳戶') || await clickInc('刪除帳戶');
  await w(3000);
  await setAll({ pw: 'LifeNum2026!' }); await w(1500);
  await page.screenshot({ path: 'D:/LifeNum/.shots/v_del.png' });
  const delConfirm = await clickExact('確認刪除') || await clickExact('刪除');
  await w(6000);
  log.push('del:' + delClick + '/' + delConfirm + '|' + (await page.evaluate(() => document.body.innerText.replace(/\n+/g, '|').slice(0, 160))));
  await w(2500);
  await ctx.close(); await browser.close();
  console.log(JSON.stringify(log, null, 1));
  console.log(fs.readdirSync(dir));
})();
