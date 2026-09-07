/* בדיקה ישירה של מסלולי הגמלים מול העולם החי.
   לא Box3 ולא allowlist: לוקח את המיקום האמיתי של כל גמל בכל פריים,
   בונה את שלושת עיגולי הגוף, ומודד אותם מול כל קוליידר של האזור ומול
   הגמלים האחרים. דוגם הקפה שלמה. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page } = await open(region, { w: 640, h: 400 })
await page.waitForFunction(()=>window.__ch1Live && window.__ch1Statics, null, { timeout: 120000 })
await page.waitForTimeout(5000)
const hits = new Map()
for (let i = 0; i < 90; i++) {
  const r = await page.evaluate(() => {
    const S = window.__ch1Scene, C = window.__ch1Statics
    if (!S || !C) return []
    const LEN = 1.35, W = 0.85
    const camels = []
    S.updateMatrixWorld(true)
    S.traverse((o) => { if (o.name && o.name.startsWith('camel:')) camels.push(o) })
    const out = []
    const spots = (o) => {
      const p = o.position, ry = o.rotation.y
      const ux = Math.sin(ry), uz = Math.cos(ry)
      return [
        { x: p.x + ux*LEN, z: p.z + uz*LEN, r: W*0.72 },
        { x: p.x, z: p.z, r: W },
        { x: p.x - ux*LEN, z: p.z - uz*LEN, r: W*0.8 },
      ]
    }
    for (const c of camels) {
      for (const s of spots(c)) {
        for (const k of C) {
          const d = Math.hypot(k.x - s.x, k.z - s.z)
          const pen = (k.r + s.r) - d
          if (pen > 0.12) out.push({ who: c.name, obj: `${k.x.toFixed(1)},${k.z.toFixed(1)} r${k.r}`, pen: +pen.toFixed(2) })
        }
      }
      for (const c2 of camels) {
        if (c2 === c) continue
        for (const a of spots(c)) for (const b of spots(c2)) {
          const d = Math.hypot(a.x-b.x, a.z-b.z)
          const pen = (a.r + b.r) - d
          if (pen > 0.12) out.push({ who: c.name, obj: c2.name, pen: +pen.toFixed(2) })
        }
      }
    }
    return out
  })
  for (const h of r) {
    const k = `${h.who} ↔ ${h.obj}`
    const cur = hits.get(k)
    if (!cur || h.pen > cur.pen) hits.set(k, { pen: h.pen, n: (cur?.n ?? 0) + 1 })
    else cur.n++
  }
  await page.waitForTimeout(1000)
}
console.log(`${region}: 90 דגימות · ${hits.size} התנגשויות שונות`)
for (const [k, v] of [...hits].sort((a,b)=>b[1].pen-a[1].pen).slice(0, 10)) {
  console.log(`   ${v.pen.toFixed(2)} מ' עומק · ${v.n}/90 דגימות · ${k}`)
}
await browser.close()
