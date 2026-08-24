/* Open a find card for real and photograph the turntable. */
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const src = readFileSync('src/lib/chapter1/finds.ts', 'utf8')
const b = src.split(/\n {2}\{/).find((x) => x.includes("'find-drachm'"))
const fx = +/\bx:\s*(-?[\d.]+)/.exec(b)[1], fz = +/\bz:\s*(-?[\d.]+)/.exec(b)[1]
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
await pg.goto('http://localhost:3000/chapter1?region=border-post', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(2200)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
await pg.evaluate(({ x, z }) => { window.__ch1Live.player.set(x, 0, z + 0.9) }, { x: fx, z: fz })
await pg.evaluate((id) => { window.__t = id }, 'find-drachm')
for (let t = 0; t < 30; t++) { await wait(400); if (await pg.evaluate(() => window.__ch1Live.nearFind === window.__t)) break }
await pg.keyboard.press('KeyF')
await wait(3000)
const open = await pg.evaluate(() => !!document.querySelector('.ch1-find'))
await pg.screenshot({ path: 'scratchpad/tour/findcard-3d.png' })
console.log('card open:', open)
await browser.close()
