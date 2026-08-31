import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1100, height: 620 } })).newPage()
await pg.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Scene).catch(() => false)) break }
await wait(6000)
const info = await pg.evaluate(() => {
  const out = []
  window.__ch1Scene.traverse((o) => {
    if (!o.isSkinnedMesh) return
    const V = o.position.constructor
    const w = new V(); o.getWorldPosition(w)
    const s = new V(); o.getWorldScale(s)
    const box = new (o.geometry.boundingBox ? o.geometry.boundingBox.constructor : Object)()
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox
    const hips = o.skeleton.bones[0]; const hw = new V(); hips.getWorldPosition(hw)
    // walk up to the normalized root (child of the R3F group)
    let p = o, depth = 0; while (p.parent && p.parent.type !== 'Scene' && depth < 8) { p = p.parent; depth++ }
    out.push({ name: o.name, worldPos: [w.x, w.y, w.z].map((n) => +n.toFixed(2)), worldScale: [s.x, s.y, s.z].map((n) => +n.toFixed(4)),
      geomBox: [bb.min.y.toFixed(1), bb.max.y.toFixed(1)], hipsWorld: [hw.x, hw.y, hw.z].map((n) => +n.toFixed(2)),
      rootScale: +p.scale.y.toFixed(4), rootName: p.name || p.type })
  })
  out.push({ player: [window.__ch1Live.player.x, window.__ch1Live.player.z], rawi: window.__ch1Live.rawiPos })
  return out
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
