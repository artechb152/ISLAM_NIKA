await page.click('text=הלאה').catch(()=>{});
await page.waitForTimeout(900);
// home toward the floating gate banner "הלאה אל מחנה הלילה"
async function bannerPos() {
  return await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')].filter(e =>
      (e.textContent || '').trim() === 'הלאה אל מחנה הלילה' && e.children.length === 0);
    const vis = els.map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width }; }).filter(m => m.w > 0);
    return vis[0] || null;
  });
}
const log = [];
for (let i = 0; i < 20; i++) {
  const m = await bannerPos();
  if (!m) { log.push({ i, m: 'no-banner' }); break; }
  const dx = m.x - 800;
  if (Math.abs(dx) > 130) {
    await page.mouse.move(800, 450);
    await page.mouse.down();
    await page.mouse.move(800 + Math.sign(dx) * Math.min(Math.abs(dx) * 0.5, 240), 450, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
  await page.keyboard.down('w'); await page.keyboard.down('Shift');
  await page.waitForTimeout(900);
  await page.keyboard.up('Shift'); await page.keyboard.up('w');
  await page.waitForTimeout(250);
  log.push({ i, mx: Math.round(m.x) });
  const hud = await page.evaluate(() => document.body.innerText);
  if (!hud.includes('הלאה אל מחנה הלילה')) { log.push({ i, gone: true }); break; }
}
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/31-yemen-gate.png', timeout: 60000 });
return { log: log.slice(-6), url: page.url(), hud: t.slice(0, 800) };
