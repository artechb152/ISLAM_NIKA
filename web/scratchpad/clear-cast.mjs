/* אותו טיפול לדמויות המדברות (placements.ts) ולעדויות (finds.ts):
   שתיהן מוגדרות בקוד ולא ב-layout, ולכן מעבר הניצבים לא נגע בהן.
   ההזזה קטנה ושומרת על הבימוי — דמות זזה חצי מטר, לא עוברת חצר. */
import { readFileSync, writeFileSync } from 'node:fs'
const FILES = { 'yemen-heights':'yemen-heights-layout.json','night-camp':'camp-layout.json','border-post':'border-layout.json','narrow-pass':'narrow-pass-layout.json','loading-road':'loading-road-layout.json',yathrib:'yathrib-layout.json',monastery:'monastery-layout.json',mecca:'mecca-layout.json',exit:'exit-layout.json' }
const layouts = Object.fromEntries(Object.entries(FILES).map(([r,f]) => [r, JSON.parse(readFileSync('src/lib/chapter1/'+f,'utf8'))]))

function clearSpot(region, x, z, selfR) {
  const L = layouts[region]; if (!L) return null
  const cf = L.campfire
  const blocked = (px, pz) => {
    if (cf && Math.hypot(px - cf.x, pz - cf.z) < (cf.r ?? 1.6) + selfR + 0.3) return true
    if (Math.hypot(px, pz) > (L.bound ?? 24) - 2) return true
    return L.props.some(q => (q.r ?? 0) > 0 && Math.hypot(q.x - px, q.z - pz) < (q.r ?? 0.5) + selfR + 0.12)
  }
  if (!blocked(x, z)) return null
  for (let ring = 1; ring <= 18; ring++) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2
      const nx = +(x + Math.cos(ang) * ring * 0.35).toFixed(2)
      const nz = +(z + Math.sin(ang) * ring * 0.35).toFixed(2)
      if (!blocked(nx, nz)) return { x: nx, z: nz, d: (ring * 0.35).toFixed(2) }
    }
  }
  return null
}

for (const [file, selfR, kind] of [['src/lib/chapter1/placements.ts', 0.55, 'cast'], ['src/lib/chapter1/finds.ts', 0.4, 'find']]) {
  let src = readFileSync(file, 'utf8')
  let region = null, n = 0
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const rm = lines[i].match(/'([a-z-]+)':\s*\[|region:\s*'([a-z-]+)'/)
    if (rm) region = rm[1] || rm[2]
    const pm = lines[i].match(/(\bx:\s*)(-?[\d.]+)(,\s*z:\s*)(-?[\d.]+)/)
    if (!pm || !region) continue
    const got = clearSpot(region, +pm[2], +pm[4], selfR)
    if (!got) continue
    lines[i] = lines[i].replace(pm[0], `${pm[1]}${got.x}${pm[3]}${got.z}`)
    console.log(`  ${kind} ${region} ${pm[2]},${pm[4]} -> ${got.x},${got.z} (${got.d}m)`)
    n++
  }
  if (n) writeFileSync(file, lines.join('\n'))
  console.log(`${file.split('/').pop()} — cleared ${n}`)
}
