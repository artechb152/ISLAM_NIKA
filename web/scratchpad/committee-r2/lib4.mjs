import { text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';

// ensure we're in-game; recover from landing page after dev reload
export async function ensureGame(page) {
  for (let i = 0; i < 3; i++) {
    const t = await text(page, 300);
    if (t && typeof t === 'string' && t.includes('המשיכו במסע')) {
      await page.getByText('המשיכו במסע').click().catch(()=>{});
      await page.waitForTimeout(13000);
      // close keys overlay if open
      continue;
    }
    const p = await pos2(page);
    if (p && !p.__err) return p;
    await page.waitForTimeout(4000);
  }
  return await pos2(page);
}

export async function walkUntil(page, keys, stepMs, maxSteps, predicate) {
  for (let i = 0; i < maxSteps; i++) {
    await hold(page, keys, stepMs);
    const p = await pos2(page);
    if (!p || p.__err) { await ensureGame(page); continue; }
    if (predicate(p)) return p;
  }
  return await pos2(page);
}
