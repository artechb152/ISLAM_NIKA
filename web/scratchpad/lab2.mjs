/* Round 2 of the live lab — motion, staging, video. Same __THREE_DEVTOOLS__
   capture as lab.mjs; adds node-side sequencing (keypresses, video recording)
   that round 1 didn't need. Diagnostic only.
     node scratchpad/lab2.mjs twoshot | vidtex | walkbase | walkdust          */
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'tour')
const BASE = 'http://localhost:3000'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const which = process.argv[2]
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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

const CAST = [...readFileSync(join(HERE, '..', 'src', 'lib', 'chapter1', 'placements.ts'), 'utf8')
  .matchAll(/who:\s*'([^']+)',\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)]
  .map((m) => ({ who: m[1], x: +m[2], z: +m[3] }))

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})

async function boot(region, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    ...(opts.record ? { recordVideo: { dir: OUT, size: { width: 960, height: 540 } } } : {}),
  })
  await ctx.addInitScript(INIT)
  const pg = await ctx.newPage()
  pg.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 300)) })
  await pg.goto(`${BASE}/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
  await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
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

if (which === 'twoshot') {
  /* Dialogue staging: today the camera stays glued behind the player's back
     during a conversation. Frame a side-on two-shot instead. */
  const envoy = CAST.find((c) => c.who === 'envoy')
  const { ctx, pg } = await boot('border-post')
  await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 1.6), envoy)
  await wait(1800)
  await pg.keyboard.press('KeyE')
  await wait(2000)
  const talking = await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))
  await pg.evaluate(({ x, z }) => {
    window.__lab.hooks.push((scene, camera) => {
      camera.position.set(x + 3.1, 1.85, z + 0.9)
      camera.lookAt(x, 1.5, z + 0.7)
      if (camera.fov !== 32) { camera.fov = 32; camera.updateProjectionMatrix() }
    })
  }, envoy)
  await wait(1500)
  await pg.screenshot({ path: join(OUT, 'lab2-twoshot.png') })
  console.log('twoshot → dialogue open:', talking)
  await ctx.close()
}

if (which === 'vidtex') {
  /* Video as a surface inside the 3D world, using one of the five finished
     POC films already sitting unused in /assets/anim-video. */
  const { ctx, pg } = await boot('mecca')
  const status = await pg.evaluate(() => new Promise((resolve) => {
    const s = window.__lab.scene
    let planeMesh = null, basicMat = null, anyMap = null
    s.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && !planeMesh) planeMesh = o
      if (o.isMesh && o.material && !Array.isArray(o.material)) {
        if (o.material.isMeshBasicMaterial && !basicMat) basicMat = o.material
        if (o.material.map && !o.material.map.isCompressedTexture && o.material.map.isTexture && !anyMap) anyMap = o.material.map
      }
    })
    if (!planeMesh || !anyMap) return resolve('missing pieces: plane=' + !!planeMesh + ' map=' + !!anyMap)
    const video = document.createElement('video'); window.__vid = video
    video.src = '/assets/anim-video/scene2.mp4'
    video.muted = true; video.loop = true; video.playsInline = true
    video.addEventListener('error', () => resolve('video load error'))
    video.addEventListener('canplay', () => {
      video.play()
      /* Blit the video through a canvas — the borrowed Texture class refused
         to upload the video element directly (stayed black); a canvas source
         uploads fine, and the real implementation simply imports
         THREE.VideoTexture at build time. */
      const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540
      const g2 = cv.getContext('2d')
      const TexClass = anyMap.constructor
      const tex = new TexClass(cv)
      tex.colorSpace = anyMap.colorSpace
      window.__lab.hooks.push(() => { g2.drawImage(video, 0, 0, 960, 540) })
      const GeoClass = planeMesh.geometry.constructor
      /* A fresh material, not a clone — the first basic material found is the
         fire billboard, and its inherited alphaMap made the screen invisible. */
      const MatClass = (basicMat || planeMesh.material).constructor
      const mat = new MatClass({ map: tex })
      mat.fog = false
      const screen = new (planeMesh.constructor)(new GeoClass(4.6, 2.63), mat)
      const p = window.__ch1Live.player
      screen.position.set(p.x - 1.5, 1.75, p.z - 4.5)
      screen.lookAt(p.x, 1.6, p.z + 3)
      s.add(screen)
      window.__lab.hooks.push(() => { tex.needsUpdate = true })
      resolve('video screen up, tex class ' + anyMap.constructor.name)
    })
  }))
  await wait(4000)
  const vs = await pg.evaluate(() => ({ t: +window.__vid.currentTime.toFixed(2), paused: window.__vid.paused, ready: window.__vid.readyState, w: window.__vid.videoWidth })).catch((e) => String(e))
  console.log('video state:', JSON.stringify(vs))
  await pg.screenshot({ path: join(OUT, 'lab2-vidtex.png') })
  console.log('vidtex →', status)
  await ctx.close()
}

if (which === 'walkbase' || which === 'walkdust') {
  /* Two recorded clips of the same walk down yemen-heights: as-is, and with
     footstep dust puffs injected — the cheapest "the ground is real" signal. */
  const { ctx, pg } = await boot('yemen-heights', { record: true })
  if (which === 'walkdust') {
    const st = await pg.evaluate(() => {
      const s = window.__lab.scene
      let planeMesh = null, anyMap = null
      s.traverse((o) => {
        if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && !planeMesh) planeMesh = o
        if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.map && !o.material.map.isCompressedTexture && !anyMap) anyMap = o.material.map
      })
      if (!planeMesh || !anyMap) return 'missing pieces'
      // soft round dust texture drawn on a canvas
      const cv = document.createElement('canvas'); cv.width = cv.height = 64
      const g = cv.getContext('2d')
      const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30)
      grad.addColorStop(0, 'rgba(214,190,150,.85)')
      grad.addColorStop(1, 'rgba(214,190,150,0)')
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64)
      const TexClass = anyMap.constructor
      const dustTex = new TexClass(cv); dustTex.colorSpace = anyMap.colorSpace; dustTex.needsUpdate = true
      const GeoClass = planeMesh.geometry.constructor
      const geo = new GeoClass(0.5, 0.5)
      const MatClass = planeMesh.material.constructor
      const puffs = []
      let acc = 0
      const prev = { x: null, z: null }
      let last = performance.now()
      window.__lab.hooks.push((scene, camera) => {
        const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now
        const p = window.__ch1Live.player
        if (prev.x !== null) {
          acc += Math.hypot(p.x - prev.x, p.z - prev.z)
          if (acc > 0.62) {
            acc = 0
            const mat = new MatClass({ map: dustTex, transparent: true, opacity: 0.55, depthWrite: false })
            mat.fog = true
            const m = new (planeMesh.constructor)(geo, mat)
            m.position.set(p.x + (Math.random() - 0.5) * 0.3, 0.12, p.z + (Math.random() - 0.5) * 0.3)
            scene.add(m)
            puffs.push({ m, age: 0 })
          }
        }
        prev.x = p.x; prev.z = p.z
        for (let i = puffs.length - 1; i >= 0; i--) {
          const pf = puffs[i]
          pf.age += dt
          pf.m.position.y += dt * 0.35
          const sc = 1 + pf.age * 2.2
          pf.m.scale.set(sc, sc, sc)
          pf.m.material.opacity = 0.55 * Math.max(0, 1 - pf.age / 0.55)
          pf.m.lookAt(camera.position)
          if (pf.age > 0.55) { scene.remove(pf.m); pf.m.material.dispose(); puffs.splice(i, 1) }
        }
      })
      return 'dust armed'
    })
    console.log('walkdust →', st)
    await wait(500)
  }
  await pg.keyboard.down('KeyW')
  await wait(6500)
  await pg.keyboard.up('KeyW')
  await wait(400)
  await ctx.close()
  // the recording lands with a random name — claim it
  const vids = readdirSync(OUT).filter((f) => f.endsWith('.webm') && !f.startsWith('walk-'))
  if (vids.length) renameSync(join(OUT, vids[0]), join(OUT, `walk-${which === 'walkdust' ? 'dust' : 'base'}.webm`))
  console.log(which, '→ recorded', vids[0] || 'NOTHING')
}

await browser.close()
