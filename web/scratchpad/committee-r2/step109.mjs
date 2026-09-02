import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
import { rotate } from './seek.mjs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
let p = await goto(page, 0, -28, { run: true, maxIter: 20, tol: 2, log: false });
console.log('P:', JSON.stringify(p));
// face exactly north: rotate until walking decreases z fastest — use goto heading correction by walking to -29 first
p = await goto(page, 0, -33, { maxIter: 6, tol: 1, log: false });
console.log('P2:', JSON.stringify(p));
// now hold W continuously 8s, checking text every 500ms WITHOUT breaking key hold
for (const k of ['w']) await page.keyboard.down(k);
for (let i = 0; i < 16; i++) {
  await page.waitForTimeout(500);
  for (const k of ['w']) await page.keyboard.down(k);
  const t = await T(200);
  if (t.includes('טוען') || (!t.includes('ית׳רב') && t.length > 60)) { console.log('FIRED at', i, JSON.stringify(await pos2(page))); break; }
}
await page.keyboard.up('w');
await page.waitForTimeout(6000);
console.log('FINAL:', JSON.stringify(await T(700)));
console.log('P3:', JSON.stringify(await pos2(page)));
await shot(page, '246-continuous-north');
await browser.close();
