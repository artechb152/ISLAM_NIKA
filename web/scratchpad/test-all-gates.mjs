import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] })
import fs from 'fs'

// כל שער קדימה: אזור, יעד, נקודת פתיחה על ציר ה"קו הישר" (x≈0.5) והכיוון
const GATES = [
  ['yemen-heights', 'night-camp', 0.5, -12, -1],
  ['night-camp', 'border-post', 0.5, -8, -1],
  ['border-post', 'narrow-pass', 0.5, -16, -1],
  ['narrow-pass', 'loading-road', 0.5, -16, -1],
  ['loading-road', 'yathrib', 0.5, -20, -1],
  ['yathrib', 'monastery', 0.5, -26, -1],
  ['monastery', 'mecca', 0.5, -10, -1],
  ['mecca', 'exit', 0.5, -16, -1],
]
for (const [region, to, sx, sz, dir] of GATES) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 620 } })
  const page = await ctx.newPage()
  await page.addInitScript(([r]) => {
    localStorage.clear()
    localStorage.setItem('ch1:intro:v1', '1')
    localStorage.setItem(`ch1:arrived:${r}:v1`, '1')
    localStorage.setItem('ch1:muted', '1')
    localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen: ['opening', 'rawi-hello'], entries: [1], region: r, found: [], solved: [], chosen: [] }))
  }, [region])
  await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'domcontentloaded' })
  let live = false
  for (let t = 0; t < 50; t++) {
    if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) { live = true; break }
    for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
    await page.waitForTimeout(1400)
  }
  if (!live) { console.log(region, '→', to, ': LOAD FAIL'); await ctx.close(); continue }
  await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 }).catch(() => {})
  for (let i = 0; i < 30; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
    await page.keyboard.press('Space'); await page.waitForTimeout(220)
  }
  await page.evaluate(([x, z]) => window.__ch1Live.player.set(x, 0, z), [sx, sz])
  await page.waitForTimeout(800)
  let verdict = 'STUCK ✗'
  for (let s = 0; s < 70; s++) {
    const r = await page.evaluate(([d]) => { const p = window.__ch1Live.player; p.set(p.x, 0, p.z + d * 0.35); return !!document.querySelector('.hud-dialogue') }, [dir]).catch(() => null)
    if (r === null) { verdict = 'NAVIGATED ✓'; break }
    if (r === true) { verdict = 'GUARD-DIALOGUE ✓ (טריגר נדלק)'; break }
    await page.waitForTimeout(90)
  }
  console.log(region.padEnd(14), '→', to.padEnd(12), verdict)
  await ctx.close()
}
await browser.close()
