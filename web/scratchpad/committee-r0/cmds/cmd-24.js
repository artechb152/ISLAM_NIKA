// steering loop: home in on visible marker icons like a player would
async function markerPos() {
  return await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')].filter(e => {
      const t = (e.textContent || '').trim();
      return (t === '✦' || t === '?') && e.children.length === 0;
    });
    const vis = els.map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), x: r.x + r.width/2, y: r.y + r.height/2, w: r.width }; }).filter(m => m.w > 0);
    return vis[0] || null;
  });
}
const log = [];
for (let i = 0; i < 14; i++) {
  const st = await page.evaluate(() => ({ nf: window.__ch1Live.nearFind, nw: window.__ch1Live.nearWho, at: window.__ch1Live.atTask }));
  if (st.nf || st.at) { log.push({ i, st }); break; }
  const m = await markerPos();
  if (!m) { log.push({ i, m: 'none' }); break; }
  const dx = m.x - 800;
  if (Math.abs(dx) > 120) {
    await page.mouse.move(800, 450);
    await page.mouse.down();
    await page.mouse.move(800 + Math.sign(dx) * Math.min(Math.abs(dx) * 0.6, 250), 450, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await page.waitForTimeout(250);
  log.push({ i, mx: Math.round(m.x) });
}
const fin = await page.evaluate(() => ({ nf: window.__ch1Live.nearFind, nw: window.__ch1Live.nearWho, at: window.__ch1Live.atTask }));
await page.screenshot({ path: base + '/25-yemen-homed.png', timeout: 60000 });
return { log, fin };
