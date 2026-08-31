/* Live visual lab — captures the running game's renderer/scene through the
   __THREE_DEVTOOLS__ hook (defined before any page script runs, so three.js
   volunteers the renderer itself) and applies candidate art directions to the
   real scene, no game-code changes. Each experiment: fresh page, apply,
   screenshot. Diagnostic only. */
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'tour')
const BASE = 'http://localhost:3000'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const region = process.argv[2] || 'mecca'
const wanted = (process.argv[3] || 'base').split(',')
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

/* Page-side experiment bodies. Each returns a short status string. */
const EXPERIMENTS = {
  base: `return 'base'`,

  recon: `
    const s = window.__lab.scene
    const mats = new Map(), lights = [], meshes = new Map()
    s.traverse(o => {
      if (o.isLight) lights.push(o.type + ' ' + (o.name || '') + ' int=' + o.intensity.toFixed(2) + ' col=#' + o.color.getHexString() + (o.position ? ' pos=' + [o.position.x, o.position.y, o.position.z].map(n => n.toFixed(1)).join(',') : ''))
      if (o.isMesh) {
        const key = (o.name || '(unnamed)')
        meshes.set(key, (meshes.get(key) || 0) + 1)
        const ms = Array.isArray(o.material) ? o.material : [o.material]
        ms.forEach(m => { if (m) mats.set(m.name || m.type, (mats.get(m.name || m.type) || 0) + 1) })
      }
    })
    return JSON.stringify({ lights, meshes: [...meshes.entries()], mats: [...mats.entries()] })`,

  atmo: `
    const s = window.__lab.scene
    let colorClass = null
    s.traverse(o => { if (!colorClass && o.isLight) colorClass = o.color.constructor })
    s.fog = { isFogExp2: true, color: new colorClass(0xe2c49c), density: 0.016, name: '' }
    s.traverse(o => {
      if (!o.material) return
      const ms = Array.isArray(o.material) ? o.material : [o.material]
      const sky = /sky|pano|dome/i.test(o.name) || /sky|pano/i.test((ms[0] && ms[0].name) || '')
      ms.forEach(m => { if (m) { if (sky) m.fog = false; m.needsUpdate = true } })
    })
    const c = document.querySelector('canvas')
    c.style.filter = 'saturate(1.18) contrast(1.06) sepia(.14) brightness(1.03)'
    const v = document.createElement('div')
    v.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;background:radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(43,20,8,.38) 100%)'
    document.body.appendChild(v)
    return 'fog+grade on'`,

  gold: `
    const s = window.__lab.scene
    const lights = []
    s.traverse(o => { if (o.isLight) lights.push(o) })
    lights.forEach(l => {
      if (l.isDirectionalLight) { l.color.setHex(0xffa055); l.intensity *= 1.25; l.position.y = Math.max(5, l.position.y * 0.22) }
      else if (l.isAmbientLight) { l.color.setHex(0x93a3c4); l.intensity *= 0.75 }
      else if (l.isHemisphereLight) { l.color.setHex(0xffd9a0); if (l.groundColor) l.groundColor.setHex(0x5a4632) }
    })
    let colorClass = lights[0].color.constructor
    s.fog = { isFogExp2: true, color: new colorClass(0xe8b070), density: 0.014, name: '' }
    s.traverse(o => {
      if (!o.material) return
      const ms = Array.isArray(o.material) ? o.material : [o.material]
      const sky = /sky|pano|dome/i.test(o.name) || /sky|pano/i.test((ms[0] && ms[0].name) || '')
      ms.forEach(m => { if (m) { if (sky) m.fog = false; m.needsUpdate = true } })
    })
    const c = document.querySelector('canvas')
    c.style.filter = 'saturate(1.2) contrast(1.05) sepia(.12)'
    return 'lights: ' + lights.map(l => l.type).join(',')`,

  paint: `
    const s = window.__lab.scene
    let n = 0
    s.traverse(o => {
      if (!o.material) return
      const ms = Array.isArray(o.material) ? o.material : [o.material]
      ms.forEach(m => {
        if (!m || !m.isMeshStandardMaterial) return
        m.onBeforeCompile = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
            'float labL = dot(gl_FragColor.rgb, vec3(.299,.587,.114)); ' +
            'float labQ = (floor(labL*5.0)+0.5)/5.0; ' +
            'gl_FragColor.rgb *= labQ/max(labL,1e-3); ' +
            'gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb*vec3(1.05,0.98,0.90), .22);\\n' +
            '#include <dithering_fragment>')
        }
        m.customProgramCacheKey = () => 'painterly'
        m.needsUpdate = true
        n++
      })
    })
    const c = document.querySelector('canvas')
    c.style.filter = 'saturate(1.12) contrast(1.04)'
    return 'patched ' + n + ' materials'`,

  tilt: `
    window.__lab.hooks.push((scene, camera) => {
      const p = window.__ch1Live && window.__ch1Live.player
      if (!p || !camera.isPerspectiveCamera) return
      camera.position.set(p.x + 7, 9, p.z + 9)
      camera.lookAt(p.x, 0.8, p.z - 2)
      if (camera.fov !== 25) { camera.fov = 25; camera.updateProjectionMatrix() }
    })
    const c = document.querySelector('canvas')
    c.style.filter = 'saturate(1.42) contrast(1.12) brightness(1.05)'
    const mk = (pos) => {
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;left:0;right:0;' + pos + ':0;height:38%;pointer-events:none;z-index:6;backdrop-filter:blur(9px);-webkit-mask-image:linear-gradient(to ' + (pos === 'top' ? 'bottom' : 'top') + ',black 25%,transparent 100%)'
      document.body.appendChild(d)
    }
    mk('top'); mk('bottom')
    return 'tilt per-frame on'`,

  combo: `
    const s = window.__lab.scene
    const lights = []
    s.traverse(o => { if (o.isLight) lights.push(o) })
    lights.forEach(l => {
      if (l.isDirectionalLight) { l.color.setHex(0xffa860); l.intensity *= 1.2; l.position.y = Math.max(6, l.position.y * 0.3) }
      else if (l.isHemisphereLight) { l.color.setHex(0xffd9a8); if (l.groundColor) l.groundColor.setHex(0x6a5138) }
    })
    const colorClass = lights[0].color.constructor
    s.fog = { isFogExp2: true, color: new colorClass(0xe6b887), density: 0.015, name: '' }
    let n = 0
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
          n++
        }
        m.needsUpdate = true
      })
    })
    const c = document.querySelector('canvas')
    c.style.filter = 'saturate(1.22) contrast(1.07) sepia(.12) brightness(1.02)'
    const v = document.createElement('div')
    v.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;background:radial-gradient(ellipse at 50% 40%, transparent 52%, rgba(43,20,8,.4) 100%)'
    document.body.appendChild(v)
    return 'combo: ' + n + ' materials, golden light, fog'`,

  iso: `
    window.__lab.hooks.push((scene, camera) => {
      const p = window.__ch1Live && window.__ch1Live.player
      if (!p || !camera.isPerspectiveCamera) return
      camera.position.set(p.x + 10, 13, p.z + 10)
      camera.lookAt(p.x, 1.2, p.z)
      if (camera.fov !== 26) { camera.fov = 26; camera.updateProjectionMatrix() }
    })
    return 'iso camera hook armed'`,

  cine: `
    window.__lab.hooks.push((scene, camera) => {
      const p = window.__ch1Live && window.__ch1Live.player
      if (!p || !camera.isPerspectiveCamera) return
      camera.position.set(p.x + 1.1, 2.3, p.z + 4.2)
      camera.lookAt(p.x - 1.2, 1.7, p.z - 8)
      if (camera.fov !== 34) { camera.fov = 34; camera.updateProjectionMatrix() }
    })
    const bars = ['top', 'bottom']
    for (const pos of bars) {
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;left:0;right:0;' + pos + ':0;height:7%;background:#000;z-index:9;pointer-events:none'
      document.body.appendChild(d)
    }
    const c = document.querySelector('canvas')
    c.style.filter = 'saturate(1.15) contrast(1.08) sepia(.1)'
    return 'cine camera armed'`,
}

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})

for (const exp of wanted) {
  if (!EXPERIMENTS[exp]) { console.log('unknown experiment:', exp); continue }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } })
  await ctx.addInitScript(INIT)
  const pg = await ctx.newPage()
  pg.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 500)) })
  await pg.goto(`${BASE}/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
  await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
  await pg.reload({ waitUntil: 'networkidle' })
  await wait(1500)
  for (const b of await pg.$$('button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes('התחילו')) { await b.click(); break }
  }
  let alive = false
  for (let t = 0; t < 40; t++) { await wait(1000); alive = await pg.evaluate(() => !!(window.__ch1Live && window.__lab && window.__lab.scene)).catch(() => false); if (alive) break }
  if (!alive) { console.log(exp, ': scene never captured'); await ctx.close(); continue }
  for (let t = 0; t < 25; t++) {
    const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })
    if (gone) break
    await wait(700)
  }
  await wait(2200)
  for (let i = 0; i < 20; i++) {
    const open = await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))
    if (!open) break
    await pg.keyboard.press('Space')
    await wait(350)
  }
  const status = await pg.evaluate(`(function(){ ${EXPERIMENTS[exp]} })()`)
  await wait(2500)
  await pg.screenshot({ path: join(OUT, `lab-${region}-${exp}.png`) })
  console.log(exp, '→', String(status).slice(0, 900))
  await ctx.close()
}
await browser.close()
