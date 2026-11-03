// שער נאמנות · כיסוי · פעם אחת בדיוק — לארבעת עמודי העזר (מילון, ספרות, מקורות, מפות).
//
// כל מחרוזת בנתונים נבדקת מול החילוץ מה-PDF שיושב לידה (‎*-extract.txt‎), לא מול עצמה.
// ההשוואה מתעלמת מרווחים בלבד: pdftotext שובר שורות ותאי טבלה באמצע משפט.
//   node concept/reference/verify-reference.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const lib = path.join(here, '../../web/src/lib/reference')
const pub = path.join(here, '../../web/public')
const read = (p) => fs.readFileSync(p, 'utf8')
const json = (f) => JSON.parse(read(path.join(lib, f)))
const squash = (s) => s.replace(/\s+/g, '')

let fail = 0
const bad = (msg) => { fail++; console.error('✗ ' + msg) }

/* ---------- מילון מונחים: 36 ערכים, כל אחד מילה במילה ובסדר המקור ---------- */
const glossary = json('glossary.json')
const gx = read(path.join(here, 'glossary-extract.txt'))
// התיקונים בשמם — אותה רשימה שב-build-glossary.mjs, כדי שההשוואה תהיה אל הטקסט המנורמל
const FIX = [
  ["(מ' ,)1966", "(מ' 1966),"], ['()632-661', '(632-661)'], ['ב- ,1918', 'ב-1918,'],
  ['משנת .874', 'משנת 874.'], ['(קוראן .)12:53', '(קוראן 12:53).'], ['(.)3:169', '(3:169).'],
  ["(מ' )2022", "(מ' 2022)"], ['(מתן ).', '(מתן).'], ['(שנת 874 ).', '(שנת 874).'],
  ['כ- 200', 'כ-200'], ['כ23-', 'כ-23'], ['א ָמאם', 'אָמאם'], ['ר ָבאט', 'רָבאט'],
  ['הטרום- אסלאמית', 'הטרום-אסלאמית'], ['דתית- קיצונית', 'דתית-קיצונית'],
]
let gnorm = gx
for (const [a, b] of FIX) gnorm = gnorm.split(a).join(b)
gnorm = squash(gnorm.replace(/ \./g, '.'))
let cursor = 0
const ids = new Set()
for (const e of glossary) {
  if (ids.has(e.id)) bad(`מילון: מזהה כפול ${e.id}`)
  ids.add(e.id)
  const at = gnorm.indexOf(squash(`${e.term} - ${e.text}`), cursor)
  if (at < 0) bad(`מילון: ${e.term} אינו מילה במילה במקור, או שאינו בסדר המקור`)
  else cursor = at + 1
}
if (glossary.length !== 36) bad(`מילון: ${glossary.length} ערכים, במקור 36`)
// כיסוי: כל תו בגוף המילון נבלע בערך כלשהו
const covered = squash(glossary.map((e) => `${e.term} - ${e.text}`).join(''))
const body = gnorm.replace(squash('פרק שבעה עשר: מילון מונחים קצר (לפי סדר א-ב)'), '')
if (covered !== body) bad(`מילון: כיסוי — ${body.length - covered.length} תווים במקור שאינם בשום ערך`)

/* ---------- ספרות מומלצת ---------- */
const reading = json('reading.json')
const rx = squash(read(path.join(here, 'reading-extract.txt')))
// שני תאים של השורה האחרונה נחצים במעבר עמוד 138→139, והחילוץ מפריד ביניהם
const PAGE_SPLIT = {
  'אסכת - סדרת הפודקאסטים של נעם בנעט': ['אסכת - סדרת הפודקאסט', 'ים של נעם בנעט'],
  'פוסקאסטים בשלל נושאים במזרח התיכון והאסלאם': ['פוסקאסטי ם בשלל נושאים במזרח', 'התיכון והאסלאם'],
  'פרקים 96, 90, 85, 79, 78, 59, 47 (א-ג), 44, 35, 25, 17, 16, 1': null, // בטבלה הפסיקים לפני המספר; נקרא מהרינדור
}
const seenR = new Set()
let rows = 0
for (const cat of reading.categories) {
  if (!rx.includes(squash(cat.title))) bad(`ספרות: קטגוריה „${cat.title}" אינה במקור`)
  for (const it of cat.items) {
    rows++
    if (seenR.has(it.id)) bad(`ספרות: מזהה כפול ${it.id}`)
    seenR.add(it.id)
    for (const k of ['title', 'author', 'topic', 'focus']) {
      const v = it[k]
      if (!v) continue
      if (v in PAGE_SPLIT) {
        const parts = PAGE_SPLIT[v]
        if (parts && !parts.every((p) => rx.includes(squash(p)))) bad(`ספרות: ${it.id}.${k} — החלקים אינם במקור`)
        continue
      }
      if (!rx.includes(squash(v).replace(/"/g, '"'))) bad(`ספרות: ${it.id}.${k} „${v}" אינו במקור`)
    }
    if (it.link && !/^https:\/\//.test(it.link)) bad(`ספרות: ${it.id} קישור לא תקין`)
  }
}
if (rows !== 9) bad(`ספרות: ${rows} שורות, בטבלה 9`)

/* ---------- מקורות ---------- */
const sources = json('sources.json')
// אותו סוג של שבר כמו במילון: ספרות שנזרקו מחוץ לסוגריים, והסוגר המרובע שהתהפך
const sx = squash(read(path.join(here, 'sources-extract.txt')).replace('(,)2016', '(2016),').replace('אלו].', 'אלו.]'))
const seenS = new Set()
for (const s of [...sources.items, ...sources.extra]) {
  if (seenS.has(s.id)) bad(`מקורות: מזהה כפול ${s.id}`)
  seenS.add(s.id)
  const line = s.author ? `${s.author} ${s.dash ?? '-'} ${s.work}` : `${s.label}: ${s.text}`
  if (!sx.includes(squash(line))) bad(`מקורות: „${line.slice(0, 40)}…" אינו מילה במילה במקור`)
}
if (!sx.includes(squash(sources.note))) bad('מקורות: ההערה אינה במקור')
if (sources.items.length !== 12) bad(`מקורות: ${sources.items.length} פריטים, במקור 12`)

/* ---------- מפות: כל נכס קיים, והמידות שלו הן מה שנרשם ---------- */
const maps = json('maps.json')
for (const m of maps.maps) {
  const f = path.join(pub, m.src)
  if (!fs.existsSync(f)) { bad(`מפות: ${m.src} חסר`); continue }
  const b = fs.readFileSync(f)
  // VP8 (lossy) — רוחב/גובה בבתים 26–29
  const w = b.readUInt16LE(26) & 0x3fff
  const h = b.readUInt16LE(28) & 0x3fff
  if (w !== m.w || h !== m.h) bad(`מפות: ${m.id} רשום ${m.w}×${m.h}, בפועל ${w}×${h}`)
}
if (maps.maps.length !== 5) bad(`מפות: ${maps.maps.length}, במקור 5`)

if (fail) {
  console.error(`\n${fail} כשלים`)
  process.exit(1)
}
console.log(`✓ מילון ${glossary.length} · ספרות ${rows} · מקורות ${sources.items.length}+${sources.extra.length} · מפות ${maps.maps.length} — נאמנות, כיסוי, פעם אחת`)
