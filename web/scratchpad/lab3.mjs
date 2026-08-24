/* Round 3 — the miniature (idea 4) in depth. Combines the approved art
   direction (gold light + fog + painterly) with the diorama camera, in
   stills and in motion, including the "camera rises to the model" transition
   that could carry region changes. Diagnostic only.
     node scratchpad/lab3.mjs still <region> | ui <region> | walk | rise      */
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'tour')
const BASE = 'http://localhost:3000'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const which = process.argv[2] || 'still'
const region = process.argv[3] || 'yemen-heights'
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

/* The approved art direction — same recipe as lab.mjs `combo`. */
const LOOK = `
  const s = window.__lab.scene
  const lights = []
  s.traverse(o => { if (o.isLight) lights.push(o) })
  lights.forEach(l => {
    if (l.isDirectionalLight) { l.color.setHex(0xffa860); l.intensity *= 1.2; l.position.y = Math.max(6, l.position.y * 0.3) }
    else if (l.isHemisphereLight) { l.color.setHex(0xffd9a8); if (l.groundColor) l.groundColor.setHex(0x6a5138) }
  })
  const colorClass = lights[0].color.constructor
  s.fog = { isFogExp2: true, color: new colorClass(0xe6b887), density: 0.015, name: '' }
  s.traverse(o => {
    if (!o.material) return
    const ms = Array.isArray(o.material) ? o.material : [o.material]
    const sky = /sky|pano|dome/i.test(o.name)
    ms.forEach(m => {
      if (!m) return
      if (sky) m.fog = false
      if (m.isMeshStandardMaterial) {
        m.onBeforeCompile = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
            'float labL = dot(gl_FragColor.rgb, vec3(.299,.587,.114)); ' +
            'float labQ = (floor(labL*6.0)+0.5)/6.0; ' +
            'gl_FragColor.rgb *= mix(1.0, labQ/max(labL,1e-3), 0.7);\\n' +
            '#include <dithering_fragment>')
        }
        m.customProgramCacheKey = () => 'painterly'
      }
      m.needsUpdate = true
    })
  })
  const cnv = document.querySelector('canvas')
  cnv.style.filter = 'saturate(1.14) contrast(1.06) brightness(1.03)'
  const v = document.createElement('div')
  v.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;background:radial-gradient(ellipse at 50% 40%, transparent 52%, rgba(43,20,8,.4) 100%)'
  document.body.appendChild(v)`

/* The diorama camera + fake DoF bands. */
const MINI_CAM = `
  window.__lab.hooks.push((scene, camera) => {
    const p = window.__ch1Live && window.__ch1Live.player
    if (!p || !camera.isPerspectiveCamera) return
    camera.position.set(p.x + 5.5, 7, p.z + 7.5)
    camera.lookAt(p.x, 0.9, p.z - 1.5)
    if (camera.fov !== 28) { camera.fov = 28; camera.updateProjectionMatrix() }
  })
  const mk = (pos) => {
    const d = document.createElement('div')
    d.style.cssText = 'position:fixed;left:0;right:0;' + pos + ':0;height:34%;pointer-events:none;z-index:5;backdrop-filter:blur(7px);-webkit-mask-image:linear-gradient(to ' + (pos === 'top' ? 'bottom' : 'top') + ',black 22%,transparent 100%)'
    document.body.appendChild(d)
  }
  mk('top'); mk('bottom')`

/* The transition: after ARM ms, the follow camera rises to the diorama over
   RISE ms — the move that could carry every region entry/exit. */
const RISE_CAM = `
  const t0 = performance.now()
  const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
  window.__lab.hooks.push((scene, camera) => {
    const p = window.__ch1Live && window.__ch1Live.player
    if (!p || !camera.isPerspectiveCamera) return
    const t = performance.now() - t0
    const k = ease(Math.max(0, Math.min(1, (t - 2500) / 2800)))
    if (k <= 0) return
    const gp = camera.position
    camera.position.set(
      gp.x + (p.x + 7 - gp.x) * k,
      gp.y + (9 - gp.y) * k,
      gp.z + (p.z + 9 - gp.z) * k)
    if (k > 0.02) camera.lookAt(p.x, 0.8 * k + 1.6 * (1 - k), p.z - 2 * k)
    const fov = 55 + (28 - 55) * k
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix() }
  })`

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

const claimVideo = (name) => {
  const vids = readdirSync(OUT).filter((f) => f.endsWith('.webm') && !f.startsWith('walk-') && !f.startsWith('mini-'))
  if (vids.length) renameSync(join(OUT, vids[0]), join(OUT, name))
  return vids[0] || 'NOTHING'
}

if (which === 'still') {
  /* The full vision, frozen: approved look + diorama camera. */
  const { ctx, pg } = await boot(region)
  await pg.evaluate(`(function(){ ${LOOK} })()`)
  await wait(2500)
  await pg.evaluate(`(function(){ ${MINI_CAM} })()`)
  await wait(1200)
  await pg.screenshot({ path: join(OUT, `mini-${region}.png`) })
  console.log('still →', `mini-${region}.png`)
  await ctx.close()
}

if (which === 'ui') {
  /* Readability check: stand where prompts show, at diorama height. */
  const { ctx, pg } = await boot(region)
  const finds = (() => {
    const src = readFileSync(join(HERE, '..', 'src', 'lib', 'chapter1', 'finds.ts'), 'utf8')
    const out = []
    for (const b of src.split(/\n {2}\{/).slice(1)) {
      const id = /id:\s*'([^']+)'/.exec(b), reg = /region:\s*'([^']+)'/.exec(b)
      const x = /\bx:\s*(-?[\d.]+)/.exec(b), z = /\bz:\s*(-?[\d.]+)/.exec(b)
      if (id && reg && x && z) out.push({ id: id[1], region: reg[1], x: +x[1], z: +z[1] })
    }
    return out
  })()
  const f = finds.find((x) => x.region === region)
  await pg.evaluate(`(function(){ ${LOOK} })()`)
  await wait(2500)
  await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 0.9), f)
  await pg.evaluate(`(function(){ ${MINI_CAM} })()`)
  await wait(1800)
  await pg.screenshot({ path: join(OUT, `mini-ui-${region}.png`) })
  console.log('ui →', `mini-ui-${region}.png`)
  await ctx.close()
}

if (which === 'walk') {
  /* How the diorama feels in motion — recorded. */
  const { ctx, pg } = await boot('yemen-heights', { record: true })
  await pg.evaluate(`(function(){ ${LOOK} })()`)
  await wait(2500)
  await pg.evaluate(`(function(){ ${MINI_CAM} })()`)
  await wait(800)
  await pg.keyboard.down('KeyW')
  await wait(7000)
  await pg.keyboard.up('KeyW')
  await wait(400)
  await ctx.close()
  console.log('walk → recorded', claimVideo('mini-walk.webm'))
}

if (which === 'rise') {
  /* The transition move: walking normally, then the camera lifts away and the
     region becomes a model. Region-exit as a gesture. */
  const { ctx, pg } = await boot('yemen-heights', { record: true })
  await pg.evaluate(`(function(){ ${LOOK} })()`)
  await wait(2500)
  await pg.evaluate(`(function(){ ${RISE_CAM} })()`)
  await pg.keyboard.down('KeyW')
  await wait(7500)
  await pg.keyboard.up('KeyW')
  await wait(600)
  await ctx.close()
  console.log('rise → recorded', claimVideo('mini-rise.webm'))
}

await browser.close()
