import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.getByText('המשיכו').click().catch(()=>{});
await page.waitForTimeout(1000);
// face north: use minimap N. Rotate until compass? Simpler: walk and check z decreasing.
for (let i = 0; i < 10; i++) {
  const p0 = await pos2(page);
  await hold(page, ['w'], 1000);
  const p1 = await pos2(page);
  if (!p0 || !p1 || p1.__err) { await ensureGame(page); continue; }
  const dz = p1.z - p0.z, dx = p1.x - p0.x;
  console.log(i, JSON.stringify(p1), 'dz', dz.toFixed(1));
  if (dz > -0.2) { // not going north; rotate
    await rotate(page, 200);
  }
  if (p1.z < -15) break;
}
const t = await text(page, 600);
console.log('TXT:', JSON.stringify(t));
await shot(page, '137-heading-north');
await browser.close();
