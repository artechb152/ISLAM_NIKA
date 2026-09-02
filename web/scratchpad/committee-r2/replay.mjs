// Speed-replay night-camp -> caravan-road using known solutions.
import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX, seekFind } from './seek.mjs';
import fs from 'fs';

const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
const T = async (n=300) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };

async function dumpLS(tag) {
  const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
  if (ls && !ls.__err) fs.writeFileSync(`C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-${tag}.json`, JSON.stringify(ls));
  console.log('LS dumped', tag);
}

async function region() { const t = await T(400); for (const r of ['מחנה הלילה','תחנת הגבול','המעבר הצר','הדרך והעמסה','ית׳רב','ית\'רב','המנזר','מכה']) if (t.includes(r)) return r; return '?'; }

async function walkToMarker(key, cond, maxIter=30) {
  for (let i = 0; i < maxIter; i++) {
    const p = await pos2(page);
    if (!p || p.__err) { await ensureGame(page); continue; }
    if (cond(p)) return p;
    const m = await markerX(page, key);
    if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
    if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
    await hold(page, ['w'], 800);
  }
  return await pos2(page);
}

async function talkLoop(startKey, maxIter=30, pick=[]) {
  await page.keyboard.press(startKey);
  await page.waitForTimeout(1600);
  for (let i = 0; i < maxIter; i++) {
    const t = await T(1800);
    if (!t) { await ensureGame(page); return 'reload'; }
    if (t.includes('להמשך') || t.includes('להשלמת השורה')) { await page.keyboard.press(' '); await page.waitForTimeout(1000); continue; }
    if (t.includes('המשך ←')) { await page.getByText('המשך', {exact:false}).last().click().catch(()=>{}); await page.waitForTimeout(1000); continue; }
    let acted = false;
    for (const p of pick) if (t.includes(p)) { await page.getByText(p).first().click().catch(()=>{}); await page.waitForTimeout(1400); acted = true; break; }
    if (!acted) return 'done';
  }
  return 'maxed';
}

async function collectFind(key) {
  const p = await seekFind(page, key, 30);
  if (p && p.nearFind) {
    await page.keyboard.press('f');
    await page.waitForTimeout(2000);
    await page.getByText('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(800);
    console.log('collected', key);
    return true;
  }
  console.log('MISS find', key, JSON.stringify(p));
  return false;
}

async function exitNorth(maxIter=25) {
  for (let i = 0; i < maxIter; i++) {
    const before = await region();
    const p = await pos2(page);
    if (!p || p.__err) { await ensureGame(page); continue; }
    const m = await markerX(page, '__gate');
    if (m && !(m.x === 0 && m.y === 0)) {
      if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
    }
    await hold(page, ['Shift','w'], 1000);
    const t = await T(200);
    if (t.includes('טוען')) { await page.waitForTimeout(8000); }
    const after = await region();
    if (after !== before && after !== '?') { console.log('ARRIVED', after); return after; }
  }
  return await region();
}

// ---- main
await ensureGame(page);
console.log('REGION:', await region());

// NIGHT CAMP: talk rawi (both questions), solve route via panel, exit
let r = await region();
if (r === 'מחנה הלילה') {
  await walkToMarker('task', p => !!p.atTask);
  await page.keyboard.press('e');
  await page.waitForTimeout(1600);
  await page.getByText('צפונה — בדרך הבשמים').click().catch(()=>{});
  await page.waitForTimeout(2200);
  await page.locator('button', { hasText: 'הלאה' }).last().click().catch(()=>{});
  await page.waitForTimeout(1500);
  console.log('route done:', JSON.stringify(await T(300)));
  // rawi talk (gate requires it)
  await talkLoop('r', 30, ['מה זה ג׳אהליה?','אז איך יודעים מה באמת קרה?','מספיק לי — נמשיך']);
  console.log('rawi done');
  await dumpLS('camp-done');
  r = await exitNorth();
}
console.log('now at:', r);
await shot(page, 'replay-1');
await browser.close();
