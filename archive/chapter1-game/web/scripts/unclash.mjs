/* מרחיק פרופים שגדלים אחד בתוך השני — ״game → game״, בלי Blender.

   הבדיקה (check-camp.mjs) כבר יודעת לכל זוג מה המרחק בפועל ומה
   המרחק הנדרש לפי הטביעה הנמדדת של המודל. מה שחסר היה רק לפעול
   על הידיעה הזאת. הסקריפט הזה דוחף כל זוג חופף למרחק הנדרש
   בתזוזה המינימלית האפשרית, וחוזר על כך עד שאין התנגשויות.

   מה הוא לא עושה, בכוונה:
   · לא נוגע בקישוט קטן (מתחת ל-SMALL) שנדחף לאוהל בכוונה
   · לא מזיז פרופ מעבר לגבול ההליכה של האזור
   · לא מזיז את המדורה, שהיא נקודת עוגן של הפריסה
   · לא מזיז דמויות או נקודות עניין — הוא מפנה להן מקום

     node scripts/unclash.mjs <אזור> [--apply]
   בלי ‎--apply הוא רק מדווח מה היה עושה.
*/

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { radiusAt } from './measure-props.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '..')
const CH1 = path.join(WEB, 'src', 'lib', 'chapter1')

const REGIONS = {
  'yemen-heights': 'yemen-heights-layout.json',
  'night-camp': 'camp-layout.json',
  camp: 'camp-layout.json',
  'border-post': 'border-layout.json',
  'narrow-pass': 'narrow-pass-layout.json',
  'loading-road': 'loading-road-layout.json',
  yathrib: 'yathrib-layout.json',
  monastery: 'monastery-layout.json',
  mecca: 'mecca-layout.json',
  exit: 'exit-layout.json',
}

const region = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!REGIONS[region]) {
  console.error(`usage: node scripts/unclash.mjs <${Object.keys(REGIONS).join('|')}> [--apply]`)
  process.exit(1)
}

const file = path.join(CH1, REGIONS[region])
const layout = JSON.parse(readFileSync(file, 'utf8'))

/* הממצאים והמשימות אינם חלק מהפריסה, ולכן הפותר לא ראה אותם —
   והזיז סלע בדיוק על גבי הכתובת החרותה, שהפכה לבלתי ניתנת
   לאיסוף. הם נטענים כאן כמכשולים קבועים: מותר להרחיק מהם, אסור
   לדחוף לתוכם. */
const FIXED = []
try {
  const src = readFileSync(path.join(CH1, 'finds.ts'), 'utf8')
  const re = /region:\s*'([^']+)',\s*\n?\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g
  for (const m of src.matchAll(re)) {
    if (m[1] === region) FIXED.push({ x: +m[2], z: +m[3], space: 1.6 })
  }
} catch { /* בלי הקובץ פשוט אין מכשולים נוספים */ }

const BOUND = layout.bound ?? 24
const SMALL = 1.2
const TRUNK_ONLY = new Set(['palm'])

/* אותה טביעה שהבדיקה משתמשת בה — אחרת נתקן לפי מידה אחת
   וניבדק לפי אחרת, ושום דבר לא יתכנס.

   radiusAt פותר את התיקייה בעצמו ומצפה לשם קובץ בלבד. העברת נתיב
   מלא נכשלה בשקט, נפלה לרדיוס המוצהר שהוא קטן בהרבה מהטביעה
   האמיתית — ולכן הפותר דיווח „אפס חפיפות“ בזמן שהבדיקה מצאה
   עשרות. כישלון מדידה נספר עכשיו ולא נבלע. */
let unmeasured = 0
function spaceOf(p) {
  if (TRUNK_ONLY.has(p.model)) return 0.9
  try {
    const m = radiusAt(p.model + '.glb', p.h)
    return m ? Math.max(p.r, m.radius) : p.r
  } catch {
    unmeasured++
    return p.r
  }
}

/* רק מה שנמצא בטווח המשוחק נבדק; תפאורת אופק לא מפריעה לאיש. */
const items = layout.props.map((p, i) => ({
  i,
  p,
  x: p.x,
  z: p.z,
  space: spaceOf(p),
  /* המדורה היא עוגן: כל השאר מסודר סביבה, אז היא לא זזה. */
  fixed: p.role === 'campfire',
  near: Math.hypot(p.x, p.z) < BOUND + 25,
}))

/* הממצאים נכנסים לפתרון כפריטים שלא זזים, כך שכל דחיפה מתרחקת
   מהם במקום להיערם עליהם. */
for (const f of FIXED) items.push({ i: -1, p: null, x: f.x, z: f.z, space: f.space, fixed: true, near: true })

const live = items.filter((it) => it.near)

function pairs() {
  const out = []
  for (let a = 0; a < live.length; a++) {
    for (let b = a + 1; b < live.length; b++) {
      const A = live[a]
      const B = live[b]
      /* קישוט קטן ליד משהו גדול הוא כוונה, לא תקלה. */
      if (Math.min(A.space, B.space) < SMALL) continue
      const need = A.space + B.space
      const d = Math.hypot(A.x - B.x, A.z - B.z)
      if (d < need) out.push({ A, B, d, need })
    }
  }
  return out
}

/* פינוי המסדרון אל כל שער.

   פתרון חפיפות מסדר את הפרופים ביחס זה לזה, אבל לא יודע דבר על
   הדרך שהשחקן צריך לעבור בה. במעבר הצר זה הספיק כדי שמגדל בוץ
   ושני סלעים ייסגרו על הקו אל השער, וההליכה התארכה פי 1.57 —
   כלומר האזור נראה פתוח והרגיש חסום. */
const ARRIVE_ = layout.player ? { x: layout.player.x, z: layout.player.z } : null
const HALF = 4.4 /* חצי רוחב מעבר נוח */
function clearLanes() {
  if (!ARRIVE_) return
  for (const e of layout.exits ?? []) {
    const vx = e.x - ARRIVE_.x, vz = e.z - ARRIVE_.z
    const L2 = vx * vx + vz * vz
    if (!L2) continue
    for (const it of live) {
      if (!it.p || it.fixed) continue
      let t = ((it.x - ARRIVE_.x) * vx + (it.z - ARRIVE_.z) * vz) / L2
      t = Math.max(0, Math.min(1, t))
      const px = ARRIVE_.x + vx * t, pz = ARRIVE_.z + vz * t
      let dx = it.x - px, dz = it.z - pz
      let d = Math.hypot(dx, dz)
      const need = it.space + HALF
      if (d >= need) continue
      if (d < 1e-3) { dx = -vz; dz = vx; d = Math.hypot(dx, dz) }
      it.x = px + (dx / d) * need
      it.z = pz + (dz / d) * need
    }
  }
}

const before = pairs().length
let moved = 0

/* פתרון איטרטיבי: כל סיבוב דוחף כל זוג חופף בדיוק עד המגע.
   פתרון בבת אחת לא עובד כי הזזה אחת יוצרת התנגשות חדשה. */
for (let round = 0; round < 400; round++) {
  /* פינוי המסדרון נעשה בתוך אותה איטרציה ולא אחריה: פינוי שרץ
     בסוף פותר את הדרך ויוצר חפיפות חדשות שאיש כבר לא מיישב. */
  clearLanes()
  const bad = pairs()
  if (!bad.length) break
  for (const { A, B, d, need } of bad) {
    const gap = need - d + 0.02
    let dx = A.x - B.x
    let dz = A.z - B.z
    let len = Math.hypot(dx, dz)
    /* שני פרופים שיושבים בדיוק אחד על השני — אין כיוון להרחיק בו,
       אז בוחרים אחד יציב לפי המיקום ברשימה במקום אקראי. */
    if (len < 1e-4) {
      const ang = ((A.i * 2.399963) % (Math.PI * 2))
      dx = Math.cos(ang)
      dz = Math.sin(ang)
      len = 1
    }
    const ux = dx / len
    const uz = dz / len
    const both = !A.fixed && !B.fixed
    const sa = A.fixed ? 0 : both ? 0.5 : 1
    const sb = B.fixed ? 0 : both ? 0.5 : 1
    A.x += ux * gap * sa
    A.z += uz * gap * sa
    B.x -= ux * gap * sb
    B.z -= uz * gap * sb
  }
}


/* אף פרופ לא יוצא מהאזור המשוחק בגלל התיקון. */
for (const it of live) {
  const r = Math.hypot(it.x, it.z)
  const lim = BOUND + 24
  if (r > lim) {
    it.x *= lim / r
    it.z *= lim / r
  }
}

const after = pairs().length
const rows = []
for (const it of items) {
  if (!it.p) continue
  const dx = it.x - it.p.x
  const dz = it.z - it.p.z
  const dist = Math.hypot(dx, dz)
  if (dist > 0.005) {
    moved++
    rows.push({ model: it.p.model, dist })
    it.p.x = +it.x.toFixed(3)
    it.p.z = +it.z.toFixed(3)
  }
}

rows.sort((a, b) => b.dist - a.dist)
console.log(`${region}: ${before} חפיפות → ${after} · הוזזו ${moved} פרופים` + (unmeasured? ` · ${unmeasured} מודלים בלי מדידה` : ''))
if (rows.length) {
  const worst = rows.slice(0, 4).map((r) => `${r.model} ${r.dist.toFixed(2)}מ׳`).join(' · ')
  console.log(`  התזוזה הגדולה: ${worst}`)
}

if (APPLY) {
  writeFileSync(file, JSON.stringify(layout, null, 2) + '\n', 'utf8')
  console.log('  נשמר.')
} else {
  console.log('  (יבש — הוסיפי --apply כדי לשמור)')
}
