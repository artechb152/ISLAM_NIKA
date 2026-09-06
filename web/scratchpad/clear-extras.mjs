/* ניצב שעומד בתוך גמל, בתוך קיר או בתוך מדורה נראה שבור מכל זווית.
   המעבר הזה מפנה כל ניצב לנקודה פנויה קרובה — שומר על הכיוון והמקום
   הכללי, כדי שהבימוי של הסצנה לא יתפרק. */
import { readFileSync, writeFileSync } from 'node:fs'
const FILES = { 'yemen-heights':'yemen-heights-layout.json','night-camp':'camp-layout.json','border-post':'border-layout.json','narrow-pass':'narrow-pass-layout.json','loading-road':'loading-road-layout.json',yathrib:'yathrib-layout.json',monastery:'monastery-layout.json',mecca:'mecca-layout.json',exit:'exit-layout.json' }
const PERSON_R = 0.55
let total = 0
for (const [region, f] of Object.entries(FILES)) {
  const file = 'src/lib/chapter1/' + f
  const raw = readFileSync(file, 'utf8')
  const indent = raw.split('\n')[1]?.match(/^( +)/)?.[1].length ?? 1
  const L = JSON.parse(raw)
  if (!L.extras?.length) continue
  const cf = L.campfire
  const blocked = (x, z) => {
    if (cf && Math.hypot(x - cf.x, z - cf.z) < (cf.r ?? 1.6) + PERSON_R + 0.3) return true
    if (Math.hypot(x, z) > (L.bound ?? 24) - 2) return true
    return L.props.some(q => (q.r ?? 0) > 0 && Math.hypot(q.x - x, q.z - z) < (q.r ?? 0.5) + PERSON_R + 0.15)
  }
  let moved = 0
  for (const e of L.extras) {
    if (!blocked(e.x, e.z)) continue
    let best = null
    for (let ring = 1; ring <= 20 && !best; ring++) {
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2
        const x = +(e.x + Math.cos(ang) * ring * 0.4).toFixed(3)
        const z = +(e.z + Math.sin(ang) * ring * 0.4).toFixed(3)
        if (!blocked(x, z)) { best = { x, z, d: (ring * 0.4).toFixed(1) }; break }
      }
    }
    if (!best) continue
    console.log(`  ${region}/${e.who} ${e.x},${e.z} -> ${best.x},${best.z} (${best.d}m)`)
    e.x = best.x; e.z = best.z; moved++
  }
  if (moved) { writeFileSync(file, JSON.stringify(L, null, indent) + '\n'); total += moved }
  console.log(`${region.padEnd(15)} extras=${L.extras.length} moved=${moved}`)
}
console.log('TOTAL extras cleared:', total)
