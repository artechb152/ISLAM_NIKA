await page.click('text=אחר כך').catch(()=>{});
await page.waitForTimeout(700);
async function markerPos() {
  return await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')].filter(e => {
      const t = (e.textContent || '').trim();
      return t === '✦' && e.children.length === 0;
    });
    const vis = els.map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width }; }).filter(m => m.w > 0);
    return vis[0] || null;
  });
}
const log = [];
for (let i = 0; i < 12; i++) {
  const s = await page.evaluate(() => ({ nf: window.__ch1Live.nearFind }));
  if (s.nf) { log.push({ i, nf: s.nf }); break; }
  const m = await markerPos();
  if (!m) { log.push({ i, m: 'none' }); break; }
  const dx = m.x - 800;
  if (Math.abs(dx) > 100) {
    await page.mouse.move(800, 450);
    await page.mouse.down();
    await page.mouse.move(800 + Math.sign(dx) * Math.min(Math.abs(dx) * 0.5, 220), 450, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  await page.waitForTimeout(250);
  log.push({ i, mx: Math.round(m.x), my: Math.round(m.y) });
}
await page.keyboard.press('f');
await page.waitForTimeout(1500);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/28-yemen-inscription-found.png', timeout: 60000 });
return { log, hud: t.slice(0, 900) };
