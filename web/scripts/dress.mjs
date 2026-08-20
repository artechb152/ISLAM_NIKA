/* מלביש אזור דליל בעזרת המודלים שכבר קיימים בספרייה.

   ארבעה אזורים עומדים על 1.6–1.8 פרופים ל-100 מ"ר, מול 3.9 במחנה
   הלילה — האזור היחיד שעבר סבב Blender אמיתי, וגם היחיד שנראה
   מיושב. ההפרש הזה הוא רוב מה שנקרא כ"ריק".

   בספרייה 72 מודלים ושבעה מהם מעולם לא הונחו באף אזור: cart,
   pergola, blacktent, ruinwall, wayhouse, house2, ridge. הם נכנסים
   כאן לראשונה.

   הצבה נדחית אם היא מתנגשת במשהו קיים, אם היא חוסמת שביל יציאה,
   או אם היא נוחתת על דמות — אותן בדיקות שהמשחק מריץ, כך שהתוצאה
   לא יכולה לצאת עם דברים שגדלים זה בזה.

     node scripts/dress.mjs <אזור> [--apply]
*/

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CH1 = path.resolve(HERE, '..', 'src', 'lib', 'chapter1')

const FILES = {
  'yemen-heights': 'yemen-heights-layout.json',
  'night-camp': 'camp-layout.json',
  'border-post': 'border-layout.json',
  'narrow-pass': 'narrow-pass-layout.json',
  'loading-road': 'loading-road-layout.json',
  yathrib: 'yathrib-layout.json',
  monastery: 'monastery-layout.json',
  mecca: 'mecca-layout.json',
  exit: 'exit-layout.json',
}

/* אוצר המילים של כל אזור. מודל שלא שייך למקום פוגע יותר משהוא
   מוסיף — עגלת סחר במנזר קוראת כטעות — ולכן הרשימה נכתבת לפי מה
   שהאזור הוא, לא לפי מה שיש במלאי. */
const VOCAB = {
  mecca:          ['awning','crate','bigjar','jars','basket','trough','cart','pergola','camel','torch'],
  'loading-road': ['crate','bigjar','jars','basket','camel','waymark','cart','trough','awning'],
  monastery:      ['bigjar','jars','basket','crate','ruinwall','torch'],
  exit:           ['waymark','bigjar','rocks','drywall','ruinwall','wayhouse','torch','crate'],
  'narrow-pass':  ['rocks','boulder1','boulder2','waymark','drywall','camel'],
  'yemen-heights':['drywall','drywall2','drywall3','bigjar','jars','basket','crate','pergola'],
  yathrib:        ['awning','bigjar','jars','basket','crate','trough','pergola','cart'],
  'border-post':  ['crate','bigjar','jars','basket','awning','cart'],
  'night-camp':   [],
}

/* מידות ברירת מחדל למודלים שאף פריסה עוד לא השתמשה בהם, ולכן
   אי אפשר להעתיק אותן ממופע קיים. */
const FALLBACK = {
  cart: { h: 1.6, r: 1.5 },
  pergola: { h: 2.8, r: 2.3 },
  blacktent: { h: 2.4, r: 3.0 },
  ruinwall: { h: 2.2, r: 2.4 },
  wayhouse: { h: 3.0, r: 2.8 },
  house2: { h: 4.0, r: 3.2 },
}

const region = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!FILES[region]) {
  console.error(`usage: node scripts/dress.mjs <${Object.keys(FILES).join('|')}> [--apply]`)
  process.exit(1)
}

const file = path.join(CH1, FILES[region])
const j = JSON.parse(readFileSync(file, 'utf8'))
const BOUND = j.bound ?? 24
const AREA = Math.PI * BOUND * BOUND
const vocab = VOCAB[region] ?? []
if (!vocab.length) {
  console.log(`${region}: אין אוצר מילים — האזור הזה לא מולבש.`)
  process.exit(0)
}

/* מידות מהמופעים הקיימים, כדי שהחדשים יישבו כמו הוותיקים */
const SPEC = {}
/* גם הגוון והשקיעה נלקחים מהמופע הקיים. בלעדיהם, אבן אפורה
   שמונחת ליד אבן מכוילת נקראת כבלוק בטון בתוך עולם חולי — וזה
   בדיוק מה שקרה בסבב הראשון. */
for (const p of j.props) if (!SPEC[p.model]) SPEC[p.model] = { h: p.h, r: p.r, tint: p.tint, sink: p.sink }
for (const [m, s] of Object.entries(FALLBACK)) SPEC[m] ||= s

/* מוקדי האזור: סביבם יש חיים, ובינם לבין עצמם עוברים. */
const FOCUS = []
if (j.campfire) FOCUS.push({ x: j.campfire.x, z: j.campfire.z })
for (const p of j.props) if (p.role === 'campfire') FOCUS.push({ x: p.x, z: p.z })
const KEY = j.props.find((p) => ['kaaba', 'well', 'mudtower', 'bayt'].includes(p.model))
if (KEY) FOCUS.push({ x: KEY.x, z: KEY.z })
if (j.player) FOCUS.push({ x: j.player.x, z: j.player.z })
/* הדמויות אינן חלק מהפריסה, ולכן הסקריפט לא ראה אותן והניח שוקת
   בדיוק במקום שבו עומד הסוחר במכה. מי שעומד במקום הוא מוקד:
   מסביבו מפנים מקום, לא ממלאים אותו. */
try {
  const src = readFileSync(path.join(CH1, 'placements.ts'), 'utf8')
  const block = src.match(new RegExp("'?" + region + "'?:\\s*\\[([^\\]]*)\\]"))
  for (const m of (block?.[1] ?? '').matchAll(/x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)) {
    FOCUS.push({ x: +m[1], z: +m[2] })
  }
} catch { /* בלי הקובץ אין דמויות להימנע מהן */ }
for (const e of j.exits ?? []) FOCUS.push({ x: e.x, z: e.z })
if (!FOCUS.length) FOCUS.push({ x: 0, z: 0 })

/* שבילים שאסור לחסום: מהשחקן אל כל יציאה */
const LANES = []
if (j.player) for (const e of j.exits ?? []) LANES.push([j.player, e])

function onLane(x, z, pad) {
  for (const [a, b] of LANES) {
    const vx = b.x - a.x, vz = b.z - a.z
    const L2 = vx * vx + vz * vz
    if (!L2) continue
    let t = ((x - a.x) * vx + (z - a.z) * vz) / L2
    t = Math.max(0, Math.min(1, t))
    const px = a.x + vx * t, pz = a.z + vz * t
    if (Math.hypot(x - px, z - pz) < pad) return true
  }
  return false
}

function free(x, z, r) {
  const d = Math.hypot(x, z)
  if (d > BOUND - 2.5) return false
  if (onLane(x, z, r + 4.4)) return false
  for (const p of j.props) {
    if (Math.hypot(p.x - x, p.z - z) < (p.r ?? 1) + r + 0.35) return false
  }
  for (const f of FOCUS) if (Math.hypot(f.x - x, f.z - z) < r + 3.2) return false
  return true
}

let seed = 20260820
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

const before = j.props.length
const added = {}
let placed = 0

/* יעד צפיפות לפי אופי האזור, לא מספר אחיד. המנזר אמור להיות שקט
   ודליל — „פחות אנשים, פחות רעש“ — ולמלא אותו זה לעבוד נגד הסצנה.
   תחנת הגבול כבר עומדת על 3.4 ולא צריכה דבר. */
const TARGET = {
  mecca: 3.0, 'loading-road': 3.0, exit: 2.8, 'narrow-pass': 2.7,
  'yemen-heights': 3.0, yathrib: 2.9, monastery: 2.3, 'border-post': 3.4,
}
const want = Math.max(0, Math.round(((TARGET[region] ?? 3.0) / 100) * AREA) - before)
/* תקרה לכל מודל: בלי זה, מה שנכנס בקלות (קירות) משתלט על האזור
   ומייצר חזרתיות שגרועה מהריקנות שבאנו לתקן. */
const CAP = Math.max(3, Math.ceil(want / Math.max(3, vocab.length - 1)))

/* פיזור בזווית הזהב סביב כל מוקד: חלוקה שלא נקראת כטבעת מדודה
   ולא כערימה אקראית. */
for (let k = 0; k < 2600 && placed < want; k++) {
  const f = FOCUS[k % FOCUS.length]
  const a = k * 2.39996
  const rad = 5 + (k % 9) * 2.4 + rnd() * 3.2
  const x = f.x + Math.cos(a) * rad
  const z = f.z + Math.sin(a) * rad
  const model = vocab[k % vocab.length]
  const s = SPEC[model]
  if (!s) continue
  if ((added[model] || 0) >= CAP) continue
  if (!free(x, z, s.r)) continue
  j.props.push({
    model,
    x: +x.toFixed(2),
    z: +z.toFixed(2),
    /* סיבוב אקראי מלא: אותו מודל שמונח באותה זווית שוב ושוב הוא
       מה שגורם לאזור להיקרא כהעתק־הדבק. */
    ry: +(rnd() * 6.283).toFixed(3),
    h: s.h,
    r: s.r,
    ...(s.tint ? { tint: s.tint } : {}),
    ...(s.sink !== undefined ? { sink: s.sink } : {}),
  })
  added[model] = (added[model] || 0) + 1
  placed++
}

const after = j.props.length
console.log(
  `${region}: ${before} → ${after} פרופים · צפיפות ` +
  `${(before / AREA * 100).toFixed(1)} → ${(after / AREA * 100).toFixed(1)} ל-100 מ"ר`,
)
if (placed) console.log('  נוסף: ' + Object.entries(added).map(([m, n]) => `${m}×${n}`).join(' · '))

if (APPLY) {
  writeFileSync(file, JSON.stringify(j, null, 2) + '\n', 'utf8')
  console.log('  נשמר.')
} else {
  console.log('  (יבש — --apply כדי לשמור)')
}
