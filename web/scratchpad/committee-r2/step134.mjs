import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const T = async (n=700) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// approach gate again, watching for the "moment"
for (let i = 0; i < 28; i++) {
  const p = await pos2(page);
  let t = await T(400);
  if (!p || p.__err) { await ensureGame(page); continue; }
  const vids = await safeEval(page, () => document.querySelectorAll('video').length);
  if (vids > 0) { console.log('VIDEO at', JSON.stringify(p)); await shot(page, '284-film-trigger'); break; }
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(400); }
  if (t.includes('רגע —') || t.includes('קרא לי')) { console.log('HOLD MSG:', JSON.stringify(t.slice(0, 200))); await shot(page, '284-hold-again'); break; }
  if (!t.includes('מכה') && t.length > 60) { console.log('REGION CHANGE:', JSON.stringify(t.slice(0,100))); await shot(page, '284-region-change'); break; }
  const m = await markerX(page, '__gate');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -240); continue; }
  if (m.x < 530 || m.x > 750) { await rotate(page, Math.max(-330, Math.min(330, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
console.log('FINAL:', JSON.stringify(await T(700)));
console.log('P:', JSON.stringify(await pos2(page)));
await shot(page, '285-after-approach');
await browser.close();
