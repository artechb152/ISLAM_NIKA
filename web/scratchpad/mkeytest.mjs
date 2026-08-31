/* M opens the map, only the map, and closes it. No model view on M. */
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
for (const b of await pg.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו')) { await b.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(2000)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
const camBefore = await pg.evaluate(() => window.__ch1Cam.position.y.toFixed(1))
await pg.keyboard.press('KeyM'); await wait(1200)
const s1 = await pg.evaluate(() => ({ map: !!document.querySelector('[class*="worldmap"], .hud-map-overlay, [class*="ch1-map"]') || [...document.querySelectorAll('div')].some((d) => d.className && String(d.className).includes('map') && d.offsetHeight > 300), modelView: window.__ch1Live.modelView, camY: +window.__ch1Cam.position.y.toFixed(1) }))
await pg.screenshot({ path: 'scratchpad/tour/mkey-map.png' })
await pg.keyboard.press('KeyM'); await wait(900)
const s2 = await pg.evaluate(() => ({ mapGone: ![...document.querySelectorAll('div')].some((d) => d.className && String(d.className).includes('worldmap') && d.offsetHeight > 300), modelView: window.__ch1Live.modelView, camY: +window.__ch1Cam.position.y.toFixed(1) }))
console.log('before camY:', camBefore, '| after M:', JSON.stringify(s1), '| after M×2:', JSON.stringify(s2))
await browser.close()
