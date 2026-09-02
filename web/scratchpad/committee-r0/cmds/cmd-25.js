async function st() { return await page.evaluate(() => ({ nf: window.__ch1Live.nearFind, nw: window.__ch1Live.nearWho, at: window.__ch1Live.atTask })); }
const log = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.down('w');
  await page.waitForTimeout(450);
  await page.keyboard.up('w');
  await page.waitForTimeout(250);
  const s = await st();
  log.push(s);
  if (s.nf || s.at || s.nw) break;
}
let t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/26-yemen-at-stone.png', timeout: 60000 });
return { log, hud: t.slice(0, 600) };
