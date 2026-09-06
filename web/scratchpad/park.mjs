/* מוצא מקום פנוי באמת לפרופ בודד, בחיפוש ספירלי סביב מיקומו הנוכחי.
   שימוש: node park.mjs <region> <model> <x> <z> */
import { readFileSync, writeFileSync } from 'node:fs'
const FILES = { 'yemen-heights':'yemen-heights-layout.json','night-camp':'camp-layout.json','border-post':'border-layout.json','narrow-pass':'narrow-pass-layout.json','loading-road':'loading-road-layout.json',yathrib:'yathrib-layout.json',monastery:'monastery-layout.json',mecca:'mecca-layout.json',exit:'exit-layout.json' }
const [region, model, sx, sz] = process.argv.slice(2)
const file = 'src/lib/chapter1/' + FILES[region]
const raw = readFileSync(file, 'utf8')
const indent = raw.split('\n')[1]?.match(/^( +)/)?.[1].length ?? 1
const L = JSON.parse(raw)
const p = L.props.find(q => q.model === model && Math.abs(q.x - +sx) < 0.15 && Math.abs(q.z - +sz) < 0.15)
if (!p) { console.log('not found'); process.exit(1) }
const R = (p.r ?? 1.2) + 0.35
const clear = (x, z) => {
  const cf = L.campfire
  if (cf && Math.hypot(x - cf.x, z - cf.z) < (cf.r ?? 1.6) + R + 0.5) return false
  if (Math.hypot(x, z) > (L.bound ?? 24) - 2) return false
  return !L.props.some(q => q !== p && Math.hypot(q.x - x, q.z - z) < (q.r ?? 0.5) + R)
}
let best = null
for (let ring = 1; ring <= 24 && !best; ring++) {
  for (let a = 0; a < 32; a++) {
    const ang = (a / 32) * Math.PI * 2
    const x = +(p.x + Math.cos(ang) * ring * 0.5).toFixed(3)
    const z = +(p.z + Math.sin(ang) * ring * 0.5).toFixed(3)
    if (clear(x, z)) { best = { x, z, moved: (ring * 0.5).toFixed(1) }; break }
  }
}
if (!best) { console.log('no clear spot found'); process.exit(1) }
console.log(`${model} ${p.x},${p.z} -> ${best.x},${best.z} (moved ${best.moved}m)`)
p.x = best.x; p.z = best.z
writeFileSync(file, JSON.stringify(L, null, indent) + '\n')
