import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
await page.keyboard.press('e');
await page.waitForTimeout(3000);
console.log('TXT:', JSON.stringify(await text(page, 1200)));
const t = await safeEval(page, () => {
  const t = window.__ch1Task;
  if (!t) return null;
  try { return JSON.parse(JSON.stringify(t)); } catch(e){ return Object.keys(t); }
});
console.log('TASK:', JSON.stringify(t));
await shot(page, '106-map-open');
await browser.close();
