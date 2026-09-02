import { getPage, shot, hold, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
const { browser, page } = await getPage();
for (let i=0;i<8;i++){
  await hold(page, ['w'], 700);
  const p = await pos2(page);
  console.log(i, JSON.stringify(p));
  if (p && p.atTask) break;
}
await page.keyboard.press('e');
await page.waitForTimeout(2500);
console.log('TXT:', JSON.stringify(await text(page, 1200)));
const t = await safeEval(page, () => {
  const t = window.__ch1Task;
  if (!t) return null;
  if (typeof t === 'function') { try { return t(); } catch(e){ return 'fnErr '+e; } }
  try { return JSON.parse(JSON.stringify(t)); } catch(e){ return Object.keys(t); }
});
console.log('TASK:', JSON.stringify(t));
await shot(page, '107-map-open');
await browser.close();
