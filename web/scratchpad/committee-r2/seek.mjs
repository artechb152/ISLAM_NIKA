import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';

export async function markerX(page, key) {
  return await safeEval(page, (key) => {
    const l = window.__ch1Live; if (!l || !l.markerEls) return null;
    const els = l.markerEls instanceof Map ? [...l.markerEls.entries()] : Object.entries(l.markerEls);
    const e = els.find(([k]) => k.includes(key));
    if (!e) return null;
    const r = e[1].getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width };
  }, key);
}

export async function rotate(page, px) {
  await page.mouse.move(640, 360);
  await page.mouse.down();
  const steps = Math.max(2, Math.round(Math.abs(px) / 40));
  for (let s = 1; s <= steps; s++) { await page.mouse.move(640 + px * s / steps, 360); await page.waitForTimeout(25); }
  await page.mouse.up();
  await page.waitForTimeout(250);
}

export async function seekFind(page, key, maxIter = 25) {
  for (let i = 0; i < maxIter; i++) {
    const p = await pos2(page);
    if (p && p.nearFind && p.nearFind.includes(key)) return p;
    if (!p || p.__err) { await ensureGame(page); continue; }
    const m = await markerX(page, key);
    if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
    if (m.x < 500 || m.x > 780) {
      const off = m.x - 640;
      await rotate(page, Math.max(-350, Math.min(350, off * 0.55)));
      continue;
    }
    await hold(page, ['w'], 800);
  }
  return await pos2(page);
}
