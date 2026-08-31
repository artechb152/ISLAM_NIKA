/* The opening narration with its film, as it plays. */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
await pg.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
for (let t = 0; t < 20; t++) { await wait(500); if (await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))) break }
await wait(3500)
const st = await pg.evaluate(() => { const v = document.querySelector('.hud-film'); return v ? { t: +v.currentTime.toFixed(2), paused: v.paused, w: v.videoWidth } : 'no film element' })
console.log('film:', JSON.stringify(st))
await pg.screenshot({ path: 'scratchpad/tour/film-opening.png' })
await browser.close()
