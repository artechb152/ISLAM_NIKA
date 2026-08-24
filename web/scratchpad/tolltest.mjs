/* The physical toll station, end to end: see the props, drag the sasanian
   coin onto the scale with the real mouse, and ask the notebook. */
import { chromium } from 'playwright-core'
import { readdirSync, renameSync } from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const TOLL = { x: 0.4, z: -3.4 }
const COIN = { x: TOLL.x - 1.5, z: TOLL.z + 0.7 } // spot 0 = sasanian
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, recordVideo: { dir: 'scratchpad/tour', size: { width: 960, height: 540 } } })
const pg = await ctx.newPage()
pg.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 200)) })
await pg.goto('http://localhost:3000/chapter1?region=border-post', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const b of await pg.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו')) { await b.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(2200)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
await pg.evaluate(({ x, z }) => { window.__ch1Live.player.set(x + 0.3, 0, z + 3.6); window.__ch1Live.yaw = 0 }, TOLL)
await wait(2200)
await pg.screenshot({ path: 'scratchpad/tour/toll-props.png' })
const px = (wx, wy, wz) => pg.evaluate(({ wx, wy, wz }) => {
  const v = window.__ch1Live.player.clone().set(wx, wy, wz).project(window.__ch1Cam)
  const r = document.querySelector('canvas').getBoundingClientRect()
  return { x: Math.round((v.x * 0.5 + 0.5) * r.width + r.left), y: Math.round((-v.y * 0.5 + 0.5) * r.height + r.top) }
}, { wx, wy, wz })
const from = await px(COIN.x, 0.35, COIN.z)
const to = await px(TOLL.x, 0.35, TOLL.z)
console.log('from', JSON.stringify(from), 'to', JSON.stringify(to))
await pg.mouse.move(from.x, from.y, { steps: 10 })
await wait(300)
await pg.mouse.down()
await wait(250)
await pg.mouse.move((from.x + to.x) / 2, Math.min(from.y, to.y) - 70, { steps: 25 })
await wait(200)
await pg.mouse.move(to.x, to.y, { steps: 25 })
await wait(300)
await pg.mouse.up()
await wait(1800)
const res = await pg.evaluate(() => ({
  solved: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').solved || [],
  panel: !!document.querySelector('.ch1-task'),
  note: document.querySelector('.ch1-task-note')?.textContent?.slice(0, 60) || null,
}))
console.log('result:', JSON.stringify(res))
await pg.screenshot({ path: 'scratchpad/tour/toll-solved.png' })
await ctx.close(); await browser.close()
const vids = readdirSync('scratchpad/tour').filter((f) => f.startsWith('page@'))
if (vids.length) renameSync('scratchpad/tour/' + vids[0], 'scratchpad/tour/toll-drag-live.webm')
console.log('recorded', vids[0] || 'NOTHING')
