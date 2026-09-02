import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
await page.getByText('אחר כך').click().catch(e => console.log('closeErr', String(e).slice(0,120)));
await page.waitForTimeout(1500);
const t = await safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
console.log('TASK:', JSON.stringify(t));
console.log('TXT:', JSON.stringify(await text(page, 500)));
await shot(page, '113-panel-closed');
if (t && t.props) {
  const tok = t.props[0];
  await page.screenshot({ path: 'C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/113b-world-token-zoom.png',
    clip: { x: Math.max(0,tok.x-110), y: Math.max(0,tok.y-110), width: 220, height: 220 } });
  const tg = t.target;
  await page.screenshot({ path: 'C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/113c-world-target-zoom.png',
    clip: { x: Math.max(0,tg.x-110), y: Math.max(0,tg.y-110), width: 220, height: 220 } });
}
await browser.close();
