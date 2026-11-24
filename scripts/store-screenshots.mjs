#!/usr/bin/env node
/**
 * Regenerates the App Store screenshots from the built web app.
 *
 *   npm run build
 *   npm run preview -- --port 4173 --strictPort
 *   node scripts/store-screenshots.mjs
 *
 * Captures the member view straight from `dist/` with mocked API responses, so
 * the listing never drifts from the shipped copy. Output sizes match what App
 * Store Connect expects: iPhone 6.7" 1290x2796 and iPad 13" 2048x2732.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/';
const OUT = 'store/ios-screenshots';

const remoteConfig = {
  version: 1,
  notice: { enabled: false, text: {}, link: null },
  features: {},
  texts: {},
  links: { privacy: null, terms: null, support: null },
  updatedAt: null,
};

const user = {
  id: 'demo',
  email: 'appreview@marlleegroup.com',
  name: '小林',
  birthDate: '1990-01-01',
  role: 'member',
  membership: { active: true, status: 'active', currentPeriodEnd: 4102444800 },
};

const json = (body) => ({
  status: 200,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(body),
});

async function stub(context) {
  await context.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/me') return route.fulfill(json({ user }));
    if (path === '/api/app-config') return route.fulfill(json(remoteConfig));
    if (path === '/api/config')
      return route.fulfill(json({ priceCents: 8800, currency: 'HKD', stripeConfigured: false }));
    if (path === '/api/daily') return route.fulfill(json({ entry: null }));
    return route.fulfill(json({ ok: true }));
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      'lifenum.profile',
      JSON.stringify({ name: '小林', birthDate: '1990-01-01' }),
    );
  });
}

async function shoot(browser, { width, height, scale, tab, file }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    locale: 'zh-TW',
    timezoneId: 'Asia/Hong_Kong',
  });
  await stub(context);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (tab) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log('saved', file);
  await context.close();
}

const browser = await chromium.launch({ channel: 'msedge' });
await shoot(browser, { width: 430, height: 932, scale: 3, tab: null, file: 'iphone-1.png' });
await shoot(browser, { width: 430, height: 932, scale: 3, tab: '本週', file: 'iphone-2.png' });
await shoot(browser, { width: 430, height: 932, scale: 3, tab: '週曆', file: 'iphone-3.png' });
await shoot(browser, { width: 1024, height: 1366, scale: 2, tab: null, file: 'ipad-1.png' });
await browser.close();
