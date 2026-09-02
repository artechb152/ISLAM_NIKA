import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: false,
  args: ['--remote-debugging-port=9777', '--window-size=1296,800']
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
await page.goto('about:blank');
console.log('BROWSER_READY');
// keep alive
await new Promise(() => {});
