/* מרווח חזותי בין אנשים לקירות ולסלעים.
   הכלל שאישר „דמות עומדת אל פני קיר" הסתיר את מה שנראה בעין ברמות
   תימן. הפתרון אינו כלל אחר — הוא להזיז את מי שעומד בתוך אבן.
   דמות מקבלת רדיוס 0.5 מ' ועוד 0.45 מ' של אוויר. */
import fs from 'node:fs'
const dir = 'src/lib/chapter1'
const PERSON_R = 0.5
const AIR = 0.45
const SOLID = /drywall|ruinwall|wall|bayt|house|gate|mudtower|wayhouse|tower|boulder|basalt|rocks|ridge|cliff|butte|terraces|well|trough|crate|jars|bigjar|amphora|claypot|altar|toll-scale|firepit|camel|cart|palm|monastery-hero|sanctuary-hero|kaaba|stone-bench/
let moved = 0
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('-layout.json'))) {
  const src = fs.readFileSync(`${dir}/${f}`, 'utf8')
  const ind = (src.match(/\n(\s+)"/) || [, '  '])[1].length
  const d = JSON.parse(src)
  const blockers = d.props
    .filter((p) => p.r > 0 && SOLID.test(p.model))
    .map((p) => ({ x: p.x, z: p.z, r: p.r, m: p.model }))
  if (d.campfire) blockers.push({ x: d.campfire.x, z: d.campfire.z, r: d.campfire.r, m: 'campfire' })
  const people = d.extras ?? []
  const bad = (x, z, skip) =>
    blockers.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + PERSON_R + AIR) ||
    people.some((o, i) => i !== skip && Math.hypot(o.x - x, o.z - z) < 1.15)
  people.forEach((p, i) => {
    if (!bad(p.x, p.z, i)) return
    let best = null
    for (let step = 0.6; step <= 6 && !best; step += 0.4) {
      for (let a = 0; a < 24; a++) {
        const t = (a / 24) * Math.PI * 2
        const nx = +(p.x + Math.cos(t) * step).toFixed(3)
        const nz = +(p.z + Math.sin(t) * step).toFixed(3)
        if (Math.hypot(nx, nz) > (d.bound ?? 24) - 2) continue
        if (!bad(nx, nz, i)) { best = { nx, nz, step }; break }
      }
    }
    if (best) {
      console.log(`${f.padEnd(30)} ${p.who.padEnd(9)} ${p.x},${p.z} → ${best.nx},${best.nz}  (+${best.step.toFixed(1)}m)`)
      p.x = best.nx; p.z = best.nz; moved++
    } else {
      console.log(`${f.padEnd(30)} ${p.who} — no clear spot found`)
    }
  })
  fs.writeFileSync(`${dir}/${f}`, JSON.stringify(d, null, ind) + (src.endsWith('\n') ? '\n' : ''))
}
console.log('moved', moved)
