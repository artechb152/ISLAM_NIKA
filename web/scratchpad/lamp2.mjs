import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yemen-heights', { w: 1200, h: 750 })
const T = { x: -7.4, z: 11.0 }
await page.waitForFunction(() => window.__ch1Scene && window.__ch1Cam, null, { timeout: 30000 })
await page.evaluate((t) => { window.__ch1Live.player.set(t.x + 2.2, 0, t.z + 3.4); window.__ch1Live.lastDrag = performance.now() }, T)
await page.waitForTimeout(1500)

const project = (name, dy) => page.evaluate(([n, d]) => {
  const g = window.__ch1Scene.getObjectByName(n), cam = window.__ch1Cam
  if (!g || !cam) return null
  const c = document.querySelector('canvas').getBoundingClientRect()
  const v = g.position.clone(); v.y += d; v.project(cam)
  if (v.z > 1) return null
  return { x: (v.x * 0.5 + 0.5) * c.width + c.left, y: (-v.y * 0.5 + 0.5) * c.height + c.top, w: c.width, h: c.height }
}, [name, dy])

let best = null
for (let i = 0; i < 24; i++) {
  const yaw = (i / 24) * Math.PI * 2
  await page.evaluate((y) => { window.__ch1Live.yaw = y; window.__ch1Live.lastDrag = performance.now() }, yaw)
  await page.waitForTimeout(150)
  const p = await project('task:lamp', 0.6)
  if (!p) continue
  if (p.x < 60 || p.y < 60 || p.x > p.w - 60 || p.y > p.h - 60) continue
  const off = Math.hypot(p.x - p.w / 2, p.y - p.h / 2)
  if (!best || off < best.off) best = { yaw, ...p, off }
}
if (!best) { console.log('LAMP NEVER VISIBLE'); await browser.close(); process.exit(1) }
await page.evaluate((y) => { window.__ch1Live.yaw = y; window.__ch1Live.lastDrag = performance.now() }, best.yaw)
await page.waitForTimeout(900)
await page.screenshot({ path: 'scratchpad/shots/yemen-lamp-BEFORE.png' })

await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
console.log('E before reveal -> task panel open:', await page.evaluate(() => !!document.querySelector('.ch1-task')))

const lampPt = await project('task:lamp', 0.6)
const stonePt = await page.evaluate(([tx, tz]) => {
  const cam = window.__ch1Cam, c = document.querySelector('canvas').getBoundingClientRect()
  const g = window.__ch1Scene.getObjectByName('task:lamp')
  const v = g.position.clone(); v.x = tx; v.z = tz; v.y += 0.5; v.project(cam)
  return { x: (v.x * 0.5 + 0.5) * c.width + c.left, y: (-v.y * 0.5 + 0.5) * c.height + c.top }
}, [T.x, T.z])
console.log('drag', JSON.stringify([Math.round(lampPt.x), Math.round(lampPt.y)]), '->', JSON.stringify([Math.round(stonePt.x), Math.round(stonePt.y)]))

await page.mouse.move(lampPt.x, lampPt.y)
await page.mouse.down()
const lampWorld = () => page.evaluate(() => { const g = window.__ch1Scene.getObjectByName('task:lamp'); return { x: g.position.x, z: g.position.z } })
let mx = lampPt.x, my = lampPt.y
for (let it = 0; it < 30; it++) {
  const w = await lampWorld()
  const ex = T.x - w.x, ez = T.z - w.z
  if (Math.hypot(ex, ez) < 0.8) break
  // יעקוביאן מקומי: כמה עולם זז לכל פיקסל, בשני הצירים
  await page.mouse.move(mx + 6, my); await page.waitForTimeout(45)
  const a = await lampWorld()
  await page.mouse.move(mx, my + 6); await page.waitForTimeout(45)
  const b = await lampWorld()
  await page.mouse.move(mx, my); await page.waitForTimeout(45)
  const J = [[(a.x - w.x) / 6, (b.x - w.x) / 6], [(a.z - w.z) / 6, (b.z - w.z) / 6]]
  const det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
  if (Math.abs(det) < 1e-9) break
  let dx = ( J[1][1] * ex - J[0][1] * ez) / det
  let dy = (-J[1][0] * ex + J[0][0] * ez) / det
  const cap = 90, m = Math.hypot(dx, dy)
  if (m > cap) { dx = dx / m * cap; dy = dy / m * cap }
  mx += dx; my += dy
  await page.mouse.move(mx, my); await page.waitForTimeout(70)
}
await page.waitForTimeout(2800)
const moved = await page.evaluate(() => { const g = window.__ch1Scene.getObjectByName('task:lamp'); return [+g.position.x.toFixed(2), +g.position.z.toFixed(2)] })
await page.mouse.up()
console.log('lamp now at', JSON.stringify(moved), 'stone at', JSON.stringify([T.x, T.z]))
await page.waitForTimeout(700)
await page.screenshot({ path: 'scratchpad/shots/yemen-lamp-DRAGGED.png' })
await page.keyboard.press('KeyE'); await page.waitForTimeout(1300)
console.log('E after reveal -> task panel open:', await page.evaluate(() => !!document.querySelector('.ch1-task')))
await page.screenshot({ path: 'scratchpad/shots/yemen-lamp-AFTER.png' })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
