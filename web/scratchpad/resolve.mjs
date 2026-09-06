/* פותר חפיפות: קורא את הזוגות הלא-מאושרים מן הביקורת החיה, ומזיז את
   הפרופ הקטן/הזיז מביניהם עד שהם נפרדים. תמיד מזיז פרופ, לעולם לא
   דמות — דמות ממוקמת לצורך מסגור השיחה. מבנים, תפאורה וצמחייה אינם
   זזים; הם מה שמגדיר את המקום. */
import { open } from './lib-probe.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

const FILES = { 'yemen-heights':'yemen-heights-layout.json','night-camp':'camp-layout.json','border-post':'border-layout.json','narrow-pass':'narrow-pass-layout.json','loading-road':'loading-road-layout.json',yathrib:'yathrib-layout.json',monastery:'monastery-layout.json',mecca:'mecca-layout.json',exit:'exit-layout.json' }
const FIXED = /drywall|wall|bayt|house|gate|wayhouse|monastery-hero|sanctuary-hero|kaaba|boulder|basalt|rocks|cliff|butte|ridge|terraces|mudtower|ruinwall|palm|shrub|desert-bush|awning|pergola|tent|well|altar|toll-scale|ansab|idol|firepit|torch/
const dir = 'src/lib/chapter1/'
const parse = (n) => { const m = n.match(/^prop:(.+)\.glb@(-?[\d.]+),(-?[\d.]+)$/); return m ? { model: m[1], x: +m[2], z: +m[3] } : null }

const region = process.argv[2]
const file = dir + FILES[region]
const raw = readFileSync(file, 'utf8')
const indent = raw.split('\n')[1]?.match(/^( +)/)?.[1].length ?? 1
const L = JSON.parse(raw)

const { browser, page } = await open(region, { w: 800, h: 500 })
await page.waitForTimeout(3500)
const audit = await page.evaluate(() => window.__ch1Audit)
await browser.close()

let moved = 0
for (const h of audit.unapproved) {
  const A = parse(h.a), B = parse(h.b)
  /* בוחרים מי זז: מי שאינו מבנה/תפאורה/צמחייה. אם שניהם זיזים — הקטן. */
  const cand = []
  if (A && !FIXED.test(A.model)) cand.push(A)
  if (B && !FIXED.test(B.model)) cand.push(B)
  if (!cand.length) continue
  const other = cand.length === 2 ? null : (A && cand[0] !== A ? A : B)
  const mover = cand.length === 2
    ? (() => { const sa = audit.sizes.find(s => s.name === h.a), sb = audit.sizes.find(s => s.name === h.b)
        const va = sa ? sa.w*sa.h*sa.d : 1e9, vb = sb ? sb.w*sb.h*sb.d : 1e9
        return va <= vb ? A : B })()
    : cand[0]
  const anchor = mover === A ? B : A
  if (!anchor) continue
  const p = L.props.find(q => q.model === mover.model && Math.abs(q.x - mover.x) < 0.06 && Math.abs(q.z - mover.z) < 0.06)
  if (!p) continue
  let dx = p.x - anchor.x, dz = p.z - anchor.z
  let d = Math.hypot(dx, dz)
  if (d < 0.05) { dx = 1; dz = 0; d = 1 }
  const push = h.depth + 0.22
  /* היעד חייב להיות פנוי בעצמו. הדחיפה הראשונה שלחה גמל מתוך בית
     היישר לתוך המדורה — הפרדה שיוצרת חדירה חדשה אינה הפרדה. */
  const bad = (nx, nz) => {
    const cf = L.campfire
    if (cf && Math.hypot(nx - cf.x, nz - cf.z) < (cf.r ?? 1.6) + (p.r ?? 0.4) + 0.6) return true
    if (Math.hypot(nx, nz) > (L.bound ?? 24) - 1) return true
    return L.props.some(q => q !== p && FIXED.test(q.model) && Math.hypot(q.x - nx, q.z - nz) < (q.r ?? 0.5) + (p.r ?? 0.4) + 0.15)
  }
  const base = Math.atan2(dz, dx)
  let placed = false
  for (const spread of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3, 3.14]) {
    const a = base + spread
    const nx = +(p.x + Math.cos(a) * push).toFixed(3)
    const nz = +(p.z + Math.sin(a) * push).toFixed(3)
    if (bad(nx, nz)) continue
    p.x = nx; p.z = nz; placed = true; break
  }
  if (placed) moved++
}
writeFileSync(file, JSON.stringify(L, null, indent) + '\n')
console.log(region, '— separated', moved, 'props of', audit.unapproved.length, 'unapproved pairs')
