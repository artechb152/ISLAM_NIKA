/* Post-phase-A tour: entry shot of every region, no injection — the game as it
   now ships. */
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'tour')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORDER = (process.env.ONLY || 'yemen-heights,night-camp,border-post,narrow-pass,loading-road,yathrib,monastery,mecca,exit').split(',')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})
for (const region of ORDER) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } })
  const pg = await ctx.newPage()
  await pg.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
  await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
  await pg.reload({ waitUntil: 'networkidle' })
  await wait(1500)
  for (const b of await pg.$$('button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes('התחילו')) { await b.click(); break }
  }
  let alive = false
  for (let t = 0; t < 40; t++) { await wait(1000); alive = await pg.evaluate(() => !!window.__ch1Live).catch(() => false); if (alive) break }
  if (!alive) { console.log(region, 'NEVER STARTED'); await ctx.close(); continue }
  for (let t = 0; t < 25; t++) {
    const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })
    if (gone) break
    await wait(700)
  }
  await wait(2600)
  for (let i = 0; i < 20; i++) {
    if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
    await pg.keyboard.press('Space'); await wait(350)
  }
  await pg.keyboard.down('KeyW'); await wait(2500); await pg.keyboard.up('KeyW'); await wait(800)
  await pg.screenshot({ path: join(OUT, `after-${region}.png`) })
  console.log(region, 'done')
  await ctx.close()
}
await browser.close()
