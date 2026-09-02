// usage: node step.mjs "w+a:1200,w:800" shotname
import { getPage, shot, hold, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
const seq = (process.argv[2]||'').split(',').filter(Boolean);
for (const s of seq) {
  const [keys, ms] = s.split(':');
  if (keys === 'drag') { // drag:dx
    await page.mouse.move(960, 400);
    await page.mouse.down();
    await page.mouse.move(960 + parseInt(ms), 400, { steps: 10 });
    await page.mouse.up();
    continue;
  }
  if (keys.startsWith('press')) { await page.keyboard.press(keys.split('=')[1]); await page.waitForTimeout(600); continue; }
  await hold(page, keys.split('+').map(k => k === 'shift' ? 'Shift' : k), parseInt(ms||'1000'));
}
await page.waitForTimeout(400);
await shot(page, process.argv[3] || 'step');
const txt = await safeEval(page, () => document.body.innerText.slice(0, 900));
console.log('TXT:', JSON.stringify(txt));
await browser.close();
