import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();

async function drag(from, to, name) {
  await page.mouse.move(from.x, from.y);
  await page.waitForTimeout(500);
  await shot(page, name + '-hover');
  await page.mouse.down();
  await page.waitForTimeout(200);
  const d0 = await safeEval(page, () => window.__ch1Task ? window.__ch1Task.dragging : 'noTask');
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await page.waitForTimeout(35);
  }
  await shot(page, name + '-mid');
  await page.mouse.up();
  await page.waitForTimeout(2000);
  await shot(page, name + '-after');
  console.log(name, 'dragging-flag-after-down:', JSON.stringify(d0));
  console.log(name, 'TXT:', JSON.stringify(await text(page, 700)));
}

// token visible at (600,461)
await drag({ x: 600, y: 461 }, { x: 790, y: 420 }, '111-east');
await drag({ x: 600, y: 461 }, { x: 570, y: 340 }, '112-north');
await browser.close();
