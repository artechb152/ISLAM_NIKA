import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
const r = await safeEval(page, () => {
  const l = window.__ch1Live;
  try { if (typeof l.player.set === 'function') { l.player.set(0, 0, -45); return 'set() ok'; } } catch(e) {}
  l.player.z = -45; l.player.x = 0; return 'direct assign';
});
console.log(r);
await page.waitForTimeout(2500);
await shot(page, '80-after-tp');
console.log('TXT:', JSON.stringify(await safeEval(page, () => document.body.innerText.slice(0, 400))));
console.log(JSON.stringify(await safeEval(page, () => ({ x: window.__ch1Live.player.x, z: window.__ch1Live.player.z }))));
await browser.close();
