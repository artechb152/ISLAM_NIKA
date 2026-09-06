/* פחות עותקים של אותו דבר, ויותר הבדל בין מי שנשאר.
   1161 פרופים בתשעה אזורים, מהם 127 דקלים ו-57 אבני דרך. הבעיה אינה
   הכמות אלא שהעותקים זהים: אותו מודל, אותו גובה, ולעיתים גם אותו
   סיבוב. מוחקים את מי שעומד הכי צמוד לתאום שלו — כלומר את מה שממילא
   נקרא ככפילות — ולמי שנשאר נותנים גובה וסיבוב משלו. */
import fs from 'node:fs'
const dir = 'src/lib/chapter1'
const CAP = {
  palm: 18, crate: 8, jars: 6, bigjar: 6, basket: 6, camel: 8, cart: 5,
  awning: 8, rocks: 8, 'desert-bush': 6, shrub: 5, waymark: 7, fodder: 4,
  boulder1: 5, boulder2: 5, boulder3: 5, boulder4: 5, basalt1: 7, basalt2: 7,
  claypot: 5, amphora: 5, sackpile: 5, waterskin: 4, firewood: 4, ridge: 6,
}
/* מודל שהוא ההר, החומה או הגיבור של האזור — לא נוגעים */
const KEEP = /hero|kaaba|house-|bayt|mudtower|drywall|ruinwall|gate|wayhouse|well|trough|altar|toll-scale|torch|firepit|collider|worn-patch|butte|cliff|terraces|find-|prop-|idol|ansab|stone-bench|pergola/
const dry = process.argv.includes('--dry')
let dropped = 0, varied = 0
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('-layout.json'))) {
  const src = fs.readFileSync(`${dir}/${f}`, 'utf8')
  const ind = (src.match(/\n(\s+)"/) || [, '  '])[1].length
  const d = JSON.parse(src)
  const byModel = new Map()
  d.props.forEach((p, i) => {
    if (KEEP.test(p.model) || p.role || p.scene) return
    if (!(p.model in CAP)) return
    if (!byModel.has(p.model)) byModel.set(p.model, [])
    byModel.get(p.model).push(i)
  })
  const kill = new Set()
  for (const [model, idxs] of byModel) {
    const cap = CAP[model]
    let live = idxs.slice()
    while (live.length > cap) {
      /* מי הכי קרוב לתאום שלו — הוא הכפילות */
      let worst = -1, wd = Infinity
      for (const i of live) {
        let nd = Infinity
        for (const j of live) {
          if (i === j) continue
          nd = Math.min(nd, Math.hypot(d.props[i].x - d.props[j].x, d.props[i].z - d.props[j].z))
        }
        if (nd < wd) { wd = nd; worst = i }
      }
      kill.add(worst)
      live = live.filter((i) => i !== worst)
    }
    // מי שנשאר מקבל גובה וסיבוב משלו
    live.forEach((i, k) => {
      const p = d.props[i]
      const seed = Math.abs(Math.sin(p.x * 12.9898 + p.z * 78.233 + k) * 43758.5453) % 1
      const h0 = p.h
      p.h = +(p.h * (0.86 + seed * 0.3)).toFixed(3)
      p.ry = +((seed * 6.283).toFixed(3))
      if (Math.abs(p.h - h0) > 0.01) varied++
    })
  }
  if (kill.size) {
    console.log(`${f.padEnd(30)} −${String(kill.size).padStart(3)} props  (${d.props.length} → ${d.props.length - kill.size})`)
    d.props = d.props.filter((_, i) => !kill.has(i))
    dropped += kill.size
  }
  if (!dry) fs.writeFileSync(`${dir}/${f}`, JSON.stringify(d, null, ind) + (src.endsWith('\n') ? '\n' : ''))
}
console.log(`dropped ${dropped} duplicate props, gave ${varied} survivors their own height and facing`)
