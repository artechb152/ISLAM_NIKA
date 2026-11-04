/* שער נאמנות למקור — פרק 12 (עמודים 83–94).

   שכבת הטקסט העברית של העמודים האלה תקינה, וה-dump (pdf-extract.txt) חולץ ב-pdftotext.
   הערבית שבורה בה ולכן הועתקה מרינדור העמודים. שלוש בדיקות עצמאיות מול ה-dump:

   1. ריבוי תווים — האותיות העבריות והספרות של כל הפרק זהות לאלה של ה-dump.
   2. סדר — כל רצף עברי של 3 מילים ומעלה שה-dump מחזיר מופיע כפי שהוא בהעתקה.
   3. ערבית — כל קטע ערבי זהה, אות באות ובסדרו, לזה של ה-dump אחרי שתי הליגטורות
      שהגופן שובר: „اللَّه" המנוקד יוצא „للا", ו„لا" מאבד את האלף.

   ריצה: node concept/chapter12/verify-source.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const dump = (await readFile(new URL('pdf-extract.txt', here), 'utf8')).replace(/[‎‏‪-‮\r]/g, '')

/* הכותרת הרצה אינה תוכן: שורת „NN -מוגבל-" ושורת שם החוברת. ⚠ מסננים לפי צורת
   השורה ולא לפי המילה — §7 מכיל „מספיקה / מוגבלת", וסינון לפי מילה מחק אותו. */
const strip = (text) =>
  text.split('\n').filter((line) => {
    const t = line.trim()
    if (!t) return false
    if (/^===== PAGE \d+/.test(t)) return false
    if (/^\d+\s+-מוגבל-$/.test(t)) return false
    if (/^האסלאם\s+-דת ותרבות\s+גירסת טיוטה\s+-מערך ההדרכה אמ”ן$/.test(t)) return false
    return true
  })

const HEB_POINTS = /[֑-ׇ]/g
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g
const norm = (s) => s.replace(HEB_POINTS, '').replace(/[^א-ת0-9]/g, '')

const body = md.slice(md.indexOf('## פרק שנים-עשר'), md.indexOf('## הערות עריכה'))
const secs = [...body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t])
const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1])
const lines = strip(dump)
const mineText = heads.join('\n') + '\n' + secs.map(([, t]) => t).join('\n')

let bad = 0

/* ---------- 0 · מספור ---------- */
const ids = secs.map(([id]) => id)
const expect = ids.map((_, i) => `§${i}`)
if (ids.join() !== expect.join()) { bad++; console.log('✗ המספור אינו רציף מ-§0: ' + ids.join(' ')) }

/* ---------- 1 · ריבוי תווים ---------- */
const bag = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); return m }
const mine = bag(norm(mineText))
const theirs = bag(norm(lines.join('')))
const diffs = []
for (const c of new Set([...mine.keys(), ...theirs.keys()])) {
  const a = mine.get(c) ?? 0, b = theirs.get(c) ?? 0
  if (a !== b) diffs.push(`"${c}" בהעתקה ${a} · במקור ${b}`)
}
if (diffs.length) { bad++; console.log('✗ ריבוי התווים אינו זהה:\n   ' + diffs.join('\n   ')) }
else console.log(`✓ ${[...mine.values()].reduce((s, n) => s + n, 0)} תווים — ריבוי זהה ל-dump המכני של עמודים 83–94`)

/* ---------- 2 · סדר: רצפים עבריים מה-dump ---------- */
const hayFlat = mineText.replace(HEB_POINTS, '').replace(/[^א-ת0-9]+/g, '')
let runs = 0
const miss = []
for (const line of lines) {
  for (const run of line.replace(HEB_POINTS, '').split(/[^א-ת ]+/)) {
    const words = run.trim().split(/\s+/).filter(Boolean)
    if (words.length < 3) continue
    runs++
    /* על האותיות בלבד — ה-dump מפזר רווחים בתוך מילים („ר ב אט"). רצף עובר אם הוא
       נחתך לכל היותר בנקודה אחת לשני חלקים שנמצאים שניהם. */
    const ok = (ws) => hayFlat.includes(ws.join(''))
    let pass = ok(words)
    for (let k = 1; !pass && k < words.length; k++) pass = ok(words.slice(0, k)) && ok(words.slice(k))
    if (!pass) miss.push(words.join(' '))
  }
}
if (miss.length) { bad++; console.log(`✗ ${miss.length}/${runs} רצפים לא נמצאו בסדרם:\n   ` + miss.join('\n   ')) }
else console.log(`✓ ${runs} רצפים עבריים מה-dump נמצאו בהעתקה בסדרם`)

/* ---------- 3 · ערבית ---------- */
const arabic = (s) => (s.replace(AR_MARKS, '').match(/[؀-ۿ]+(?:\s+[؀-ۿ]+)*/g) ?? [])
  .map((x) => x.replace(/\s+/g, '').replace(/لا/g, 'ل'))
const mineAr = arabic(mineText.replace(/اللَّهِ?/g, 'للا'))
const theirAr = arabic(lines.join('\n'))
const arBad = []
for (let i = 0; i < Math.max(mineAr.length, theirAr.length); i++)
  if (mineAr[i] !== theirAr[i]) arBad.push(`#${i + 1}\n     בהעתקה ${mineAr[i] ?? '—'}\n     במקור  ${theirAr[i] ?? '—'}`)
if (arBad.length) { bad++; console.log('✗ קטעים ערביים שונים:\n   ' + arBad.join('\n   ')) }
else console.log(`✓ ${mineAr.length} קטעים ערביים — זהים ל-dump, אות באות ובסדרם`)

console.log(bad ? `❌ ${bad} כשלים` : `✅ ${secs.length} סעיפים · ${heads.length} כותרות · שלוש בדיקות עצמאיות · אפס סטיות מהמקור`)
process.exit(bad ? 1 : 0)
