import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })

async function region(r, seeded = true) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(r, 'EXC:', e.message.slice(0, 100)))
  await page.addInitScript(([rr, s]) => {
    localStorage.clear()
    if (s) { localStorage.setItem('ch1:intro:v1', '1'); localStorage.setItem(`ch1:arrived:${rr}:v1`, '1') }
    localStorage.setItem('ch1:muted', '1')
  }, [r, seeded])
  await page.goto(`http://localhost:3000/chapter1?region=${r}`, { waitUntil: 'domcontentloaded' })
  for (let t = 0; t < 40; t++) {
    if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
    await page.waitForTimeout(1200)
  }
  await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 }).catch(() => {})
  return { page, ctx }
}
async function shootAt(page, x, z, file) {
  await page.evaluate(([xx, zz]) => window.__ch1Live.player.set(xx, 0, zz), [x, z])
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `scratchpad/${file}` })
  console.log('shot', file)
}

// 1) פתיח: ריצה טרייה לגמרי — הסרט אמור להתנגן בפאנל
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('ch1:muted', '1') })
  await page.goto('http://localhost:3000/chapter1', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)
  for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו')) { await b.click().catch(() => {}); break } }
  await page.waitForSelector('.hud-film', { timeout: 60000 }).catch(() => console.log('no .hud-film!'))
  await page.waitForTimeout(6000)
  const st = await page.evaluate(() => { const v = document.querySelector('.hud-film'); return v ? { t: v.currentTime.toFixed(1), paused: v.paused, w: v.videoWidth } : null })
  console.log('film state:', JSON.stringify(st))
  await page.screenshot({ path: 'scratchpad/hero-opening.png' })
  await ctx.close()
}
// 2) טרסות תימן
{ const { page, ctx } = await region('yemen-heights'); await shootAt(page, -11, 12, 'hero-terraces.png'); await ctx.close() }
// 3) שער הגבול
{ const { page, ctx } = await region('border-post'); await shootAt(page, -1.8, -14, 'hero-gate.png'); await ctx.close() }
// 4) המנזר
{ const { page, ctx } = await region('monastery'); await shootAt(page, -4.5, 3.5, 'hero-monastery.png'); await ctx.close() }
// 5) מתחם מכה
{ const { page, ctx } = await region('mecca'); await shootAt(page, 9, -3.5, 'hero-sanctuary.png'); await ctx.close() }
await browser.close()
