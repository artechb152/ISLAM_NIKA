/* חפיפה אמיתית, לא תיבות. לכל זוג שהביקורת סימנה: דוגמים קודקודים
   של הקטן, יורים קרן דרך המשולשים של הגדול וסופרים חציות. מספר אי-זוגי
   של חציות = הנקודה בתוך הגוף. תיבה של גוש בזלת בולעת כד שעומד שבעה
   מטרים ממנו; משולשים לא. */
import { chromium } from 'playwright-core'
const region = process.argv[2]
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport:{width:800,height:500} })
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Audit && window.__ch1Scene, null, { timeout:120000 })
await page.waitForTimeout(6000)
let prev=-1, same=0
for (let k=0;k<20 && same<3;k++){ const n=await page.evaluate(()=>window.__ch1Audit?.counted??0); same = n===prev?same+1:0; prev=n; await page.waitForTimeout(2600) }

const res = await page.evaluate(() => {
  const scene = window.__ch1Scene
  const rep = window.__ch1Audit
  scene.updateMatrixWorld(true)
  /* שם התצוגה בדוח הוא שם@מיקום — נבנה את אותו מפתח כדי למצוא את העצם */
  const byKey = new Map()
  scene.traverse(o => {
    if (!o.name || !/^(prop|cast|find|task|camel):/.test(o.name)) return
    const p = o.getWorldPosition(new o.position.constructor())
    byKey.set(`${o.name}@${p.x.toFixed(1)},${p.z.toFixed(1)}`, o)
    byKey.set(o.name, byKey.get(o.name) || o)
  })
  const apply = (m, x, y, z) => ({
    x: m[0]*x + m[4]*y + m[8]*z + m[12],
    y: m[1]*x + m[5]*y + m[9]*z + m[13],
    z: m[2]*x + m[6]*y + m[10]*z + m[14],
  })
  const tris = (root, cap = 40000) => {
    const out = []
    root.traverse(n => {
      if (!n.isMesh || !n.geometry?.attributes?.position || out.length > cap) return
      const g = n.geometry, pos = g.attributes.position, idx = g.index
      const m = n.matrixWorld.elements
      const count = idx ? idx.count : pos.count
      const step = Math.max(3, 3 * Math.ceil(count / 3 / cap))
      for (let i = 0; i + 2 < count; i += step) {
        const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i+1) : i+1, c = idx ? idx.getX(i+2) : i+2
        out.push([
          apply(m, pos.getX(a), pos.getY(a), pos.getZ(a)),
          apply(m, pos.getX(b), pos.getY(b), pos.getZ(b)),
          apply(m, pos.getX(c), pos.getY(c), pos.getZ(c)),
        ])
      }
    })
    return out
  }
  const verts = (root, want = 400) => {
    const all = []
    root.traverse(n => {
      if (!n.isMesh || !n.geometry?.attributes?.position) return
      const pos = n.geometry.attributes.position, m = n.matrixWorld.elements
      const step = Math.max(1, Math.ceil(pos.count / want))
      for (let i = 0; i < pos.count; i += step) all.push(apply(m, pos.getX(i), pos.getY(i), pos.getZ(i)))
    })
    return all
  }
  /* Möller–Trumbore לכיוון +X בלבד */
  const crosses = (p, t) => {
    const [a,b,c] = t
    const e1 = { x:b.x-a.x, y:b.y-a.y, z:b.z-a.z }
    const e2 = { x:c.x-a.x, y:c.y-a.y, z:c.z-a.z }
    /* d = (1,0,0)  →  h = d × e2 = (0, -e2.z, e2.y) */
    const h = { x:0, y:-e2.z, z:e2.y }
    const det = e1.x*h.x + e1.y*h.y + e1.z*h.z
    if (Math.abs(det) < 1e-9) return false
    const inv = 1/det
    const s = { x:p.x-a.x, y:p.y-a.y, z:p.z-a.z }
    const u = inv * (s.x*h.x + s.y*h.y + s.z*h.z)
    if (u < 0 || u > 1) return false
    const q = { x: s.y*e1.z - s.z*e1.y, y: s.z*e1.x - s.x*e1.z, z: s.x*e1.y - s.y*e1.x }
    const v = inv * q.x
    if (v < 0 || u + v > 1) return false
    const tt = inv * (e2.x*q.x + e2.y*q.y + e2.z*q.z)
    return tt > 1e-6
  }
  const out = []
  for (const h of rep.unapproved) {
    const A = byKey.get(h.a), B = byKey.get(h.b)
    if (!A || !B) { out.push({ a:h.a, b:h.b, note:'לא נמצא בסצנה' }); continue }
    /* דוגמים את הקטן ובודקים אותו מול הגדול */
    const sa = new (A.position.constructor)(), sb = new (B.position.constructor)()
    const small = A, big = B
    const T = tris(big)
    const V = verts(small)
    if (!T.length || !V.length) { out.push({ a:h.a, b:h.b, note:'אין רשת' }); continue }
    let inside = 0
    for (const p of V) {
      let n = 0
      for (const t of T) if (crosses(p, t)) n++
      if (n % 2 === 1) inside++
    }
    out.push({ a:h.a, b:h.b, box:`${h.depth}m ${Math.round(h.frac*100)}%`,
               samples:V.length, inside, pct: +(100*inside/V.length).toFixed(1) })
  }
  return out
})
console.log(`== ${region}`)
let real = 0
for (const r of res) {
  if (r.note) { console.log(`   ? ${r.a} ↔ ${r.b} — ${r.note}`); continue }
  const verdict = r.pct >= 2 ? 'חפיפה אמיתית' : 'תיבה בלבד'
  if (r.pct >= 2) real++
  console.log(`   ${r.pct >= 2 ? '✗' : '✓'} ${r.a} ↔ ${r.b} · תיבות ${r.box} · רשת ${r.pct}% (${r.inside}/${r.samples}) — ${verdict}`)
}
console.log(`   סיכום ${region}: ${real} חפיפות אמיתיות מתוך ${res.length} שסומנו`)
await browser.close()
