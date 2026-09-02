import { getPage, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
const r = await safeEval(page, () => {
  const l = window.__ch1Live;
  return { p: { x: l.player.x, y: l.player.y, z: l.player.z }, yaw: l.yaw, atTask: l.atTask, nearWho: l.nearWho, nearFind: l.nearFind, rawi: l.rawiPos };
});
console.log(JSON.stringify(r));
await browser.close();
