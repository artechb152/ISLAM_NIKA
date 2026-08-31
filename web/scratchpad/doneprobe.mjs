/* Is scroll-case already "done" in yathrib's eyes? Marker classes + notebook. */
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
await wait(3000)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
await pg.evaluate(() => window.__ch1Live.player.set(-3.8, 0, 14.8))
await wait(2500)
const st = await pg.evaluate(() => ({
  notebook: localStorage.getItem('ch1:notebook:v1'),
  scrollMarker: window.__ch1Live.markerEls.get('find:find-scroll-case')?.className,
  sherdMarker: window.__ch1Live.markerEls.get('find:find-yathrib-sherd')?.className,
  scrollDisplay: window.__ch1Live.markerEls.get('find:find-scroll-case')?.style.display,
  nearFind: window.__ch1Live.nearFind,
  player: { x: +window.__ch1Live.player.x.toFixed(2), z: +window.__ch1Live.player.z.toFixed(2) },
  dToScroll: +Math.hypot(window.__ch1Live.player.x + 3.8, window.__ch1Live.player.z - 13.9).toFixed(2),
  dynamic: window.__ch1Live.dynamic.map((c) => ({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), r: c.r })),
  nearStatic: window.__ch1Live.colliders.filter((c) => Math.hypot(c.x + 3.8, c.z - 13.9) < 3.5).map((c) => ({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), r: c.r })),
}))
console.log(JSON.stringify(st, null, 1))
await browser.close()
