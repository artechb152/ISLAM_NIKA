/* Walk through the first gate for real and record the shipped rise gesture. */
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync, renameSync } from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const layout = JSON.parse(readFileSync('src/lib/chapter1/yemen-heights-layout.json', 'utf8'))
const gate = layout.exits.find((e) => e.to === 'night-camp')
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, recordVideo: { dir: 'scratchpad/tour', size: { width: 960, height: 540 } } })
const pg = await ctx.newPage()
await pg.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const b of await pg.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו')) { await b.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(2200)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
// stand three metres before the gate, facing it, then walk in
await pg.evaluate(({ x, z }) => { window.__ch1Live.player.set(x, 0, z + 3.2); window.__ch1Live.yaw = 0 }, gate)
await wait(1200)
await pg.keyboard.down('KeyW')
await wait(2500)
await pg.keyboard.up('KeyW')
await wait(3800) // rise + banner + reload begins
const url = pg.url()
await wait(2000)
await ctx.close()
await browser.close()
console.log('landed at:', url)
const vids = readdirSync('scratchpad/tour').filter((f) => f.endsWith('.webm') && !/^(walk|mini|drag)-/.test(f) && !f.startsWith('rise-'))
if (vids.length) renameSync('scratchpad/tour/' + vids[0], 'scratchpad/tour/rise-live.webm')
console.log('recorded', vids[0] || 'NOTHING')
