/* Round 4 — the interactions themselves. Proves the one verb the diegetic
   task redesign needs: pick a real object in the live world with the pointer
   and place it somewhere else. Real mouse events drive real handlers doing
   real unprojection — nothing is key-framed. Also captures the task panel
   as it is today, for the before shot.
     node scratchpad/lab4.mjs panel | drag                                    */
import { chromium } from 'playwright-core'
import { readdirSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'tour')
const BASE = 'http://localhost:3000'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const which = process.argv[2] || 'panel'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const TOLL = { x: 0.4, z: -3.4 } // the toll-scale station, from tasks.ts

const INIT = `
window.__lab = { renderers: [], scene: null, camera: null, hooks: [] }
window.__THREE_DEVTOOLS__ = {
  dispatchEvent(ev) {
    const d = ev.detail
    if (d && d.isWebGLRenderer && !d.__labWrapped) {
      d.__labWrapped = true
      window.__lab.renderers.push(d)
      const orig = d.render.bind(d)
      d.render = (scene, camera) => {
        if (scene && scene.isScene) { window.__lab.scene = scene; window.__lab.camera = camera }
        for (const h of window.__lab.hooks) { try { h(scene, camera, d) } catch (e) {} }
        orig(scene, camera)
      }
    }
  }
}`

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})

async function boot(reg, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    ...(opts.record ? { recordVideo: { dir: OUT, size: { width: 960, height: 540 } } } : {}),
  })
  await ctx.addInitScript(INIT)
  const pg = await ctx.newPage()
  pg.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 300)) })
  await pg.goto(`${BASE}/chapter1?region=${reg}`, { waitUntil: 'networkidle', timeout: 90000 })
  await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
  await pg.reload({ waitUntil: 'networkidle' })
  await wait(1500)
  for (const b of await pg.$$('button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes('התחילו')) { await b.click(); break }
  }
  for (let t = 0; t < 40; t++) {
    await wait(1000)
    if (await pg.evaluate(() => !!(window.__ch1Live && window.__lab.scene)).catch(() => false)) break
  }
  for (let t = 0; t < 25; t++) {
    const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })
    if (gone) break
    await wait(700)
  }
  await wait(2200)
  for (let i = 0; i < 20; i++) {
    if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
    await pg.keyboard.press('Space')
    await wait(350)
  }
  return { ctx, pg }
}

if (which === 'panel') {
  /* The task panel as it is today — walk to the toll station, press E. */
  const { ctx, pg } = await boot('border-post')
  await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 1.1), TOLL)
  await wait(1800)
  /* E goes to the envoy while he still has lines — exhaust him first. */
  let open = false
  for (let round = 0; round < 8 && !open; round++) {
    await pg.keyboard.press('KeyE')
    await wait(1200)
    open = await pg.evaluate(() => !!document.querySelector('.ch1-task'))
    if (open) break
    for (let i = 0; i < 20; i++) {
      if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
      await pg.keyboard.press('Space')
      await wait(320)
    }
  }
  await wait(600)
  await pg.screenshot({ path: join(OUT, 'lab4-panel.png') })
  console.log('panel → task panel open:', open)
  await ctx.close()
}

if (which === 'drag') {
  /* Real pointer pick-and-place in the live world. The page-side handlers do
     screen→world unprojection against the object's ground plane; Playwright
     moves the real mouse. If this works, every diegetic task rides on it. */
  const { ctx, pg } = await boot('border-post', { record: true })
  await pg.evaluate(({ x, z }) => { window.__ch1Live.player.set(x - 0.6, 0, z + 5.2); window.__ch1Live.yaw = 0.15 }, TOLL)
  await wait(1500)

  const setup = await pg.evaluate(({ tx, tz }) => {
    const s = window.__lab.scene
    const cam = window.__lab.camera
    const V3 = window.__ch1Live.player.constructor
    // the nearest movable prop: a crate/basket/jar near the toll station
    const pl = window.__ch1Live.player
    let obj = null, best = 7
    s.traverse((o) => {
      if (!o.isMesh || !/crate|basket|jar|claypot|bigjar/i.test(o.name)) return
      const w = new V3(); o.getWorldPosition(w)
      const d = Math.hypot(w.x - pl.x, w.z - pl.z)
      // in front of the camera and close to the player, so the act is legible
      const pr = w.clone(); pr.project(cam)
      if (pr.z > 1 || Math.abs(pr.x) > 0.75 || Math.abs(pr.y) > 0.75) return
      if (d < best) { best = d; obj = o }
    })
    if (!obj) return { err: 'no prop found near station' }
    window.__dragObj = obj
    /* Reparent-free dragging: move the object's world position through its
       parent's inverse. Simplest correct route: attach to scene. */
    const w = new V3(); obj.getWorldPosition(w)
    s.attach(obj)
    const baseY = obj.position.y
    const drag = { on: false }
    const toWorld = (cx, cy) => {
      const r = document.querySelector('canvas').getBoundingClientRect()
      const nx = ((cx - r.left) / r.width) * 2 - 1
      const ny = -(((cy - r.top) / r.height) * 2 - 1)
      const pt = new V3(nx, ny, 0.5).unproject(cam)
      const dir = pt.sub(cam.position).normalize()
      const t = (baseY - cam.position.y) / dir.y
      return cam.position.clone().addScaledVector(dir, t)
    }
    const near = (cx, cy) => {
      const p = new V3(); obj.getWorldPosition(p); p.y += 0.2
      p.project(cam)
      const r = document.querySelector('canvas').getBoundingClientRect()
      const sx = (p.x * 0.5 + 0.5) * r.width + r.left
      const sy = (-p.y * 0.5 + 0.5) * r.height + r.top
      return Math.hypot(sx - cx, sy - cy) < 90
    }
    const glow = (on) => {
      const ms = Array.isArray(obj.material) ? obj.material : [obj.material]
      ms.forEach((m) => { if (m && m.emissive) { m.emissive.setHex(on ? 0x664411 : 0x000000) } })
    }
    /* The game's own mouse-drag rotates the camera, and its capture listener
       registered first — stopImmediatePropagation cannot reach it. Freeze the
       yaw for the duration of the drag instead, so the drag plane stays put. */
    let yaw0 = 0
    window.__lab.hooks.push(() => { if (drag.on) window.__ch1Live.yaw = yaw0 })
    window.__dbg = { downs: 0, grabs: 0, moves: 0, missBy: -1 }
    window.addEventListener('mousedown', (e) => {
      window.__dbg.downs++
      const p = new V3(); obj.getWorldPosition(p); p.y += 0.2
      p.project(cam)
      const r = document.querySelector('canvas').getBoundingClientRect()
      const sx = (p.x * 0.5 + 0.5) * r.width + r.left
      const sy = (-p.y * 0.5 + 0.5) * r.height + r.top
      window.__dbg.missBy = Math.round(Math.hypot(sx - e.clientX, sy - e.clientY))
      if (near(e.clientX, e.clientY)) { window.__dbg.grabs++; drag.on = true; yaw0 = window.__ch1Live.yaw; glow(true); e.stopImmediatePropagation() }
    }, true)
    window.addEventListener('mousemove', (e) => {
      if (!drag.on) { return }
      window.__dbg.moves++
      e.stopImmediatePropagation()
      const w2 = toWorld(e.clientX, e.clientY)
      obj.position.x = w2.x; obj.position.z = w2.z; obj.position.y = baseY + 0.8
    }, true)
    window.addEventListener('mouseup', (e) => {
      if (!drag.on) return
      drag.on = false; glow(false)
      obj.position.y = baseY
      e.stopImmediatePropagation()
    }, true)
    // hand node the screen coords of the object and of the drop target
    const px = (v) => {
      const p = v.clone(); p.project(cam)
      const r = document.querySelector('canvas').getBoundingClientRect()
      return { x: Math.round((p.x * 0.5 + 0.5) * r.width + r.left), y: Math.round((-p.y * 0.5 + 0.5) * r.height + r.top) }
    }
    const op = new V3(); obj.getWorldPosition(op); op.y += 0.2
    /* The drop target must be projected at the drag plane's own height —
       projecting it at the station's 1.1 m put the plane intersection 5.3 m
       short of the station, toward the camera. */
    return { name: obj.name, from: px(op), to: px(new V3(tx, baseY, tz)) }
  }, { tx: TOLL.x, tz: TOLL.z })
  console.log('drag setup →', JSON.stringify(setup))
  await pg.evaluate(() => {
    const c = document.createElement('div')
    c.id = '__cursor'
    c.style.cssText = 'position:fixed;width:22px;height:22px;border-radius:50%;background:rgba(246,236,216,.9);box-shadow:0 0 0 3px rgba(90,34,48,.8), 0 2px 8px rgba(0,0,0,.5);z-index:99;pointer-events:none;transform:translate(-50%,-50%)'
    document.body.appendChild(c)
    window.addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
  })

  if (!setup.err) {
    const { from, to } = setup
    await pg.mouse.move(from.x, from.y, { steps: 8 })
    await wait(400)
    await pg.mouse.down()
    await wait(300)
    // a curved, human path to the scale
    const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 90 }
    await pg.mouse.move(mid.x, mid.y, { steps: 30 }); await wait(250)
    await pg.mouse.move(to.x, to.y, { steps: 30 })
    await wait(400)
    await pg.mouse.up()
    await wait(600)
    /* Ground truth — where the object actually ended up. */
    const end = await pg.evaluate(({ tx, tz }) => {
      const V3 = window.__ch1Live.player.constructor
      const w = new V3(); window.__dragObj.getWorldPosition(w)
      return { at: { x: +w.x.toFixed(2), z: +w.z.toFixed(2) }, distToStation: +Math.hypot(w.x - tx, w.z - tz).toFixed(2) }
    }, { tx: TOLL.x, tz: TOLL.z })
    console.log('end state →', JSON.stringify(end))
    console.log('dbg →', JSON.stringify(await pg.evaluate(() => window.__dbg)))
    // step up to the drop point for a close-up
    await pg.evaluate(({ x, z }) => { window.__ch1Live.player.set(x + 0.4, 0, z + 2.4); window.__ch1Live.yaw = 0 }, TOLL)
    await wait(1400)
    await pg.screenshot({ path: join(OUT, 'lab4-drag-end.png') })
  }
  await ctx.close()
  const vids = readdirSync(OUT).filter((f) => f.endsWith('.webm') && !/^(walk|mini)-/.test(f) && !f.startsWith('drag-'))
  if (vids.length) renameSync(join(OUT, vids[0]), join(OUT, 'drag-proof.webm'))
  console.log('drag → recorded', vids[0] || 'NOTHING')
}

await browser.close()
