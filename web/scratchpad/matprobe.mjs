import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1100, height: 620 } })).newPage()
await pg.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Scene).catch(() => false)) break }
await wait(6000)
const info = await pg.evaluate(() => {
  const out = []
  window.__ch1Scene.traverse((o) => {
    if (o.isSkinnedMesh || (o.isMesh && /traveler|char1|Mesh_0/.test(o.name))) {
      const m = Array.isArray(o.material) ? o.material[0] : o.material
      out.push({ name: o.name, skinned: !!o.isSkinnedMesh, bones: o.skeleton ? o.skeleton.bones.length : 0,
        mat: m.type, map: !!m.map, mapSrc: m.map && m.map.source && m.map.source.data ? (m.map.source.data.width + 'x' + m.map.source.data.height) : null,
        color: m.color ? '#' + m.color.getHexString() : null, side: m.side, vertexColors: m.vertexColors, emissive: m.emissive ? '#' + m.emissive.getHexString() : null,
        hasUV: !!o.geometry.attributes.uv, uvCount: o.geometry.attributes.uv ? o.geometry.attributes.uv.count : 0,
        posCount: o.geometry.attributes.position.count, colorAttr: !!o.geometry.attributes.color, mapColorSpace: m.map ? m.map.colorSpace : null })
    }
  })
  return out
})
await pg.screenshot({ path: 'scratchpad/tour/hide-before.png' })
const hid = await pg.evaluate(() => { let n = 0; window.__ch1Scene.traverse((o) => { if (o.name === 'char1') { o.visible = false; n++ } }); return n })
await wait(800)
await pg.screenshot({ path: 'scratchpad/tour/hide-rawi.png' })
console.log('hid rawi meshes:', hid)
const tp = await pg.evaluate(() => { const out = {}; window.__ch1Scene.traverse((o) => { if (o.name === 'traveler' && o.isSkinnedMesh) { const v = new o.position.constructor(); o.getWorldPosition(v); out.travelerWorld = [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; const b = o.skeleton.bones[0]; const bw = new o.position.constructor(); b.getWorldPosition(bw); out.rootBoneWorld = [+bw.x.toFixed(2), +bw.y.toFixed(2), +bw.z.toFixed(2)]; out.bindMode = o.bindMode; out.visible = o.visible; let p = o, chain = []; while (p) { chain.push(p.name || p.type); p = p.parent } out.chain = chain.slice(0, 6) } }); out.player = [window.__ch1Live.player.x, window.__ch1Live.player.z]; return out })
console.log(JSON.stringify(tp))
await browser.close()
