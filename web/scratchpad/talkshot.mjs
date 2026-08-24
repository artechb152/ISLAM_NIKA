/* Does the shipped talk camera frame a two-shot? No injection — real E press. */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ENVOY = { x: -3.4, z: -5.4 } // placements: envoy at border-post — read below if wrong
import { readFileSync } from 'node:fs'
const m = readFileSync('src/lib/chapter1/placements.ts', 'utf8').match(/who:\s*'envoy',\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/)
if (m) { ENVOY.x = +m[1]; ENVOY.z = +m[2] }
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
await pg.goto('http://localhost:3000/chapter1?region=border-post', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const b of await pg.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו')) { await b.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(2500)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 1.7), ENVOY)
await wait(1800)
await pg.keyboard.press('KeyE')
await wait(2600)  // let the blend settle
const talking = await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))
await pg.screenshot({ path: 'scratchpad/tour/talkcam-envoy.png' })
console.log('dialogue open:', talking)
// close and verify the camera comes home
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(320) }
await wait(2000)
await pg.screenshot({ path: 'scratchpad/tour/talkcam-after.png' })
await browser.close()
console.log('done')
