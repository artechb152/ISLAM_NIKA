/* עדות שבלועה בתוך דמות אי אפשר לראות, ולכן אי אפשר לאסוף. הדמויות
   (extras ב-layout ו-PLACEMENTS בקוד) לא נספרו כמכשול בשום מעבר קודם. */
import { readFileSync, writeFileSync } from 'node:fs'
const FILES = { 'yemen-heights':'yemen-heights-layout.json','night-camp':'camp-layout.json','border-post':'border-layout.json','narrow-pass':'narrow-pass-layout.json','loading-road':'loading-road-layout.json',yathrib:'yathrib-layout.json',monastery:'monastery-layout.json',mecca:'mecca-layout.json',exit:'exit-layout.json' }
const layouts = Object.fromEntries(Object.entries(FILES).map(([r,f]) => [r, JSON.parse(readFileSync('src/lib/chapter1/'+f,'utf8'))]))
const plSrc = readFileSync('src/lib/chapter1/placements.ts','utf8')
const people = {}
{ let region = null
  for (const line of plSrc.split('\n')) {
    const rm = line.match(/'([a-z-]+)':\s*\[/); if (rm) region = rm[1]
    const pm = line.match(/x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/)
    if (pm && region) (people[region] ??= []).push({ x: +pm[1], z: +pm[2] }) } }
for (const [r, L] of Object.entries(layouts)) for (const e of L.extras ?? []) (people[r] ??= []).push({ x: e.x, z: e.z })

let src = readFileSync('src/lib/chapter1/finds.ts','utf8')
const lines = src.split('\n'); let region = null, n = 0
for (let i = 0; i < lines.length; i++) {
  const rm = lines[i].match(/region:\s*'([a-z-]+)'/); if (rm) region = rm[1]
  const pm = lines[i].match(/(\bx:\s*)(-?[\d.]+)(,\s*z:\s*)(-?[\d.]+)/)
  if (!pm || !region || !people[region]) continue
  let x = +pm[2], z = +pm[4]
  const hit = people[region].find(p => Math.hypot(p.x - x, p.z - z) < 0.95)
  if (!hit) continue
  let dx = x - hit.x, dz = z - hit.z, d = Math.hypot(dx, dz)
  if (d < 0.05) { dx = 1; dz = 0; d = 1 }
  const nx = +(hit.x + (dx / d) * 1.35).toFixed(2), nz = +(hit.z + (dz / d) * 1.35).toFixed(2)
  lines[i] = lines[i].replace(pm[0], `${pm[1]}${nx}${pm[3]}${nz}`)
  console.log(`  find ${region} ${x},${z} -> ${nx},${nz}`); n++
}
if (n) writeFileSync('src/lib/chapter1/finds.ts', lines.join('\n'))
console.log('finds cleared from people:', n)
