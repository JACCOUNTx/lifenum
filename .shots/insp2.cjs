const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const c = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-TW' });
  const p = await c.newPage();
  await p.goto('https://lifenum.pages.dev/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  await p.evaluate(() => { const t = document.querySelector('input[type=text]'); const d = document.querySelector('input[type=date]'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; const set=(el,v)=>{s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}; if(t) set(t,'A'); if(d) set(d,'1990-01-01'); });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(e => (e.innerText||'').includes('開始探索')); if (x) x.click(); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('nav button')).find(e => (e.innerText||'').includes('我的')); if (x) x.click(); });
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(e => (e.innerText||'').includes('登入 / 註冊')); if (x) x.click(); });
  await p.waitForTimeout(2500);
  const html = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map((x,i)=>({i, t:x.innerText.trim().slice(0,20), cls:(x.className||'').slice(0,40)}));
    const forms = Array.from(document.querySelectorAll('form')).map(f=>f.outerHTML.slice(0,600));
    return { btns: btns.slice(-12), forms };
  });
  console.log(JSON.stringify(html, null, 1).slice(0, 2500));
  await b.close();
})();
