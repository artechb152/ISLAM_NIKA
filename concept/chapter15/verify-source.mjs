/* שער נאמנות למקור — פרק 15 (עמודים 111–112).

   הפרק הוא טבלה: שנה · אירוע · גאוגרפיה ומקום השפעה, 23 שורות, ותאי גאוגרפיה ממוזגים.
   שכבת הטקסט תקינה באותיות אבל מפרקת את הטבלה לעמודות, ולכן שיוך התאים נקרא מהרינדור.
   ארבע בדיקות מול ה-dump (pdf-extract.txt):

   1. ריבוי תווים — האותיות העבריות והספרות של כל הפרק זהות לאלה של ה-dump.
   2. סדר השנים — רצף השנים ב-SOURCE-TEXT זהה לרצף שה-dump מחזיר, עמוד אחר עמוד.
   3. סדר האירועים — שרשור האירועים זהה, אות באות, לשרשור שה-dump מחזיר. ב-dump של
      עמוד 111 כל שנה צמודה לאירוע שלה, ולכן שם השיוך מוכח (§1–§18). בעמוד 112 השנים
      והאירועים נפרדים, וזהות שני הרצפים היא מה שאפשר להוכיח; השיוך לפי מקום — מהרינדור.
   4. גאוגרפיה — ששת התאים בסדר ה-dump, וכל אחד מכסה את מספר השורות שנקרא מהרינדור.

   ריצה: node concept/chapter15/verify-source.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const dump = (await readFile(new URL('pdf-extract.txt', here), 'utf8')).replace(/[‎‏‪-‮\r\f]/g, '')

/* הכותרת הרצה אינה תוכן. ⚠ מסננים לפי צורת השורה ולא לפי המילה „מוגבל" (המוקש של פרק 12). */
const pages = dump.split(/^===== PAGE \d+$/m).slice(1).map((p) =>
  p.split('\n').map((l) => l.trim()).filter((t) => {
    if (!t) return false
    if (/^\d+\s+-מוגבל-$/.test(t)) return false
    if (/^האסלאם\s+-דת ותרבות\s+גירסת טיוטה\s+-מערך ההדרכה אמ”ן$/.test(t)) return false
    return true
  }))

const HEB_POINTS = /[֑-ׇ]/g
const norm = (s) => s.replace(HEB_POINTS, '').replace(/[^א-ת0-9]/g, '')

const body = md.slice(md.indexOf('## פרק חמישה עשר'), md.indexOf('## הערות עריכה'))
const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1])
const secs = [...body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)]
  .map(([, id, t]) => [id, t.trim().split('\n')])
const rows = secs.slice(1).map(([id, [year, event]]) => ({ id, year, event }))

/* כל שורה, ובאיזה תא גאוגרפיה היא יושבת — לפי סדר הכותרות בגוף. */
let region = null
const regionOf = new Map()
for (const line of body.split('\n')) {
  const h = line.match(/^## (.+)$/)
  if (h && !h[1].startsWith('פרק ')) region = h[1]
  const s = line.match(/^### (§\d+)$/)
  if (s && region) regionOf.set(s[1], region)
}

let bad = 0
const fail = (msg) => { bad++; console.log('✗ ' + msg) }

/* ---------- 0 · מספור ומבנה ---------- */
const ids = secs.map(([id]) => id)
if (ids.join() !== ids.map((_, i) => `§${i}`).join()) fail('המספור אינו רציף מ-§0: ' + ids.join(' '))
if (rows.length !== 23) fail(`צפויות 23 שורות, נמצאו ${rows.length}`)
for (const r of rows) if (!/^\d{3}(-\d{3})?$/.test(r.year) || !r.event) fail(`${r.id} אינו „שנה ⏎ אירוע"`)

/* ---------- 1 · ריבוי תווים ---------- */
const bag = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); return m }
const mine = bag(norm(heads.join('\n') + '\n' + secs.map(([, t]) => t.join('\n')).join('\n')))
const theirs = bag(norm(pages.flat().join('\n')))
const diffs = []
for (const c of new Set([...mine.keys(), ...theirs.keys()])) {
  const a = mine.get(c) ?? 0, b = theirs.get(c) ?? 0
  if (a !== b) diffs.push(`"${c}" בהעתקה ${a} · במקור ${b}`)
}
if (diffs.length) fail('ריבוי התווים אינו זהה:\n   ' + diffs.join('\n   '))
else console.log(`✓ ${[...mine.values()].reduce((s, n) => s + n, 0)} תווים — ריבוי זהה ל-dump של עמודים 111–112`)

/* ---------- 2+3 · שנים ואירועים, בסדרם ---------- */
/* עמוד 111: „ 570הולדת מוחמד  595נישואי..." — שנה ואחריה האירוע שלה, באותה שורה. */
const p111 = pages[0].join('\n')
const pairs111 = [...p111.split('\n').filter((l) => /^\d{3}[א-ת]/.test(l)).join('  ')
  .matchAll(/(\d{3})(.+?)(?=\s{2,}\d{3}|$)/g)].map(([, y, e]) => [y, norm(e)])
const mine111 = rows.slice(0, pairs111.length).map((r) => [r.year, norm(r.event)])
if (JSON.stringify(mine111) !== JSON.stringify(pairs111))
  fail('עמוד 111 — שנה+אירוע אינם תואמים לזוגות ב-dump:\n   ' +
    pairs111.map(([y, e], i) => `${y} ${e}  ⇄  ${mine111[i]?.join(' ')}`).filter((s) => { const [a, b] = s.split('  ⇄  '); return a !== b }).join('\n   '))
else console.log(`✓ עמוד 111: ${pairs111.length} זוגות שנה+אירוע זהים ל-dump, בסדרם (${rows[0].id}–${rows[pairs111.length - 1].id})`)

/* עמוד 112: השנים בשורות של ספרות בלבד, האירועים בשורות של אותיות. */
const rest = rows.slice(pairs111.length)
const years112 = pages[1].filter((l) => /^[\d\s-]+$/.test(l)).join(' ').split(/\s+/)
const regions112 = new Set(heads.map(norm))
const events112 = norm(pages[1].filter((l) => /[א-ת]/.test(l) && !regions112.has(norm(l)) &&
  !l.split(/\s+/).every((w) => heads.some((h) => h.includes(w)))).join(''))
if (rest.map((r) => r.year).join() !== years112.join()) fail(`עמוד 112 — סדר השנים: ${rest.map((r) => r.year)} מול ${years112}`)
else if (norm(rest.map((r) => r.event).join('')) !== events112) fail('עמוד 112 — שרשור האירועים אינו זהה ל-dump')
else console.log(`✓ עמוד 112: ${rest.length} שנים ו-${rest.length} אירועים, כל רצף זהה ל-dump בסדרו (השיוך — מהרינדור)`)

/* ---------- 4 · גאוגרפיה ---------- */
const REGIONS = [ // [תא, שורות שהוא מכסה] — נקרא מרינדור העמודים
  ['חצי האי ערב', 13], ['חצי האי ערב והלבנט', 1], ['חצי האי ערב ועיראק', 4],
  ['סוריה', 1], ['עיראק', 3], ['הלבנט והסהר הפורה', 1],
]
const got = REGIONS.map(([name]) => [name, rows.filter((r) => regionOf.get(r.id) === name).length])
if (JSON.stringify(got) !== JSON.stringify(REGIONS)) fail('תאי הגאוגרפיה: ' + JSON.stringify(got))
else if (rows.some((r) => !regionOf.has(r.id))) fail('יש שורה בלי תא גאוגרפיה')
else console.log(`✓ ${REGIONS.length} תאי גאוגרפיה, ${REGIONS.map(([, n]) => n).join('+')} = ${rows.length} שורות`)

console.log(bad ? `\n✗ ${bad} כשלים` : '\n✓ השער עבר')
process.exit(bad ? 1 : 0)
