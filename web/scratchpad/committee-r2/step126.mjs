import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1000) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// walk to merchant
const keys = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  return l.markerEls instanceof Map ? [...l.markerEls.keys()] : Object.keys(l.markerEls);
});
console.log('KEYS:', JSON.stringify(keys));
const who = (keys||[]).find(k => !k.startsWith('find') && !k.startsWith('__') && k !== 'task');
for (let i = 0; i < 25; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.nearWho) { console.log('NEAR', p.nearWho); break; }
  const m = await markerX(page, who);
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
await page.keyboard.press('e'); await page.waitForTimeout(1600);
for (let round = 0; round < 4; round++) {
  let progressed = false;
  for (let i = 0; i < 30; i++) {
    const t = await T(1700);
    if (t.includes('להמשך') || t.includes('להשלמת')) {
      const m = t.match(/(הסוחר|רָאוִי)\n\n([^\n]+)/g);
      if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,150)));
      await page.keyboard.press(' '); await page.waitForTimeout(1000); progressed = true; continue;
    }
    if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); progressed = true; continue; }
    const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
    const q = (btns||[]).find(s => s.endsWith('?'));
    if (q) { console.log('CHOICE:', JSON.stringify(q)); await B(q).click().catch(()=>{}); await page.waitForTimeout(1500); progressed = true; continue; }
    break;
  }
  const t2 = await T(400);
  if (t2.includes('דברו עם הסוחר') && progressed) { await page.keyboard.press('e'); await page.waitForTimeout(1500); continue; }
  if (!progressed) break;
}
await shot(page, '271-merchant-done');
const nb = await safeEval(page, () => JSON.parse(localStorage.getItem('ch1:notebook:v1')));
console.log('entries:', nb.entries.length, 'seen tail:', nb.seen.slice(-4).join(','));
await browser.close();
