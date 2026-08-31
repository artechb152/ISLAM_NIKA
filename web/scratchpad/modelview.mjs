/* M cycles: model view → parchment map → closed. Photograph both. */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
await pg.goto('http://localhost:3000/chapter1?region=yathrib', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(2500)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
await pg.keyboard.press('KeyM')
await wait(2200)
console.log('modelView:', await pg.evaluate(() => window.__ch1Live.modelView))
await pg.keyboard.down('KeyW'); await wait(1200); await pg.keyboard.up('KeyW'); await wait(500)
await pg.screenshot({ path: 'scratchpad/tour/modelview-live.png' })
await pg.keyboard.press('KeyM')
await wait(1200)
console.log('map overlay:', await pg.evaluate(() => !!document.querySelector('.ch1-worldmap, [class*="worldmap"], [class*="hud-map"]')))
await pg.screenshot({ path: 'scratchpad/tour/modelview-map.png' })
await pg.keyboard.press('KeyM')
await wait(800)
console.log('closed, modelView:', await pg.evaluate(() => window.__ch1Live.modelView))
await pg.screenshot({ path: 'scratchpad/tour/modelview-back.png' })
await browser.close()
