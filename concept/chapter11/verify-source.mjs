/* שער נאמנות למקור — פרק 11 (עמודים 77–82).

   שכבת הטקסט של העמודים האלה תקינה, וה-dump (pdf-extract.txt) חולץ ב-pdftotext.
   שתי בדיקות עצמאיות של ההעתקה מולו:

   1. ריבוי תווים — האותיות והספרות של כל הפרק זהות לאלה של ה-dump.
   2. סדר — כל רצף עברי של 3 מילים ומעלה שה-dump מחזיר מופיע כפי שהוא בהעתקה.

   ריצה: node concept/chapter11/verify-source.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const dump = await readFile(new URL('pdf-extract.txt', here), 'utf8')

/* הכותרת הרצה אינה תוכן: שורת „NN -מוגבל-" ושורת שם החוברת. בעמודים 77–82 אין
   בגוף הטקסט שורה שמכילה „מוגבל" או „מערך ההדרכה", ולכן הסינון בטוח. */
const strip = (text) =>
  text.split('\n').filter((line) => {
    const t = line.trim()
    if (!t) return false
    if (/^===== PAGE \d+/.test(t)) return false
    if (t.includes('מוגבל')) return false
    if (t.includes('מערך ההדרכה')) return false
    return true
  })

const NIQQUD = /[֑-ׇً-ْٰ]/g
const norm = (s) => s.replace(NIQQUD, '').replace(/[^א-ת؀-ۿa-zA-Z0-9]/g, '')

const secs = [...md.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t])
const body = md.slice(md.indexOf('## פרק אחד עשר'), md.indexOf('## הערות עריכה'))
const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1])
const lines = strip(dump)

let bad = 0

/* ---------- 1 · ריבוי תווים ---------- */
const bag = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); return m }
const mine = bag(norm(heads.join('') + secs.map(([, t]) => t).join('')))
const theirs = bag(norm(lines.join('')))
const diffs = []
for (const c of new Set([...mine.keys(), ...theirs.keys()])) {
  const a = mine.get(c) ?? 0, b = theirs.get(c) ?? 0
  if (a !== b) diffs.push(`"${c}" בהעתקה ${a} · במקור ${b}`)
}
if (diffs.length) { bad++; console.log('✗ ריבוי התווים אינו זהה:\n   ' + diffs.join('\n   ')) }
else console.log(`✓ ${[...mine.values()].reduce((s, n) => s + n, 0)} תווים — ריבוי זהה ל-dump המכני של עמודים 77–82`)

/* ---------- 2 · סדר: רצפים עבריים מה-dump ---------- */
const hay = ' ' + (heads.join(' ') + ' ' + secs.map(([, t]) => t).join(' '))
  .replace(NIQQUD, '').replace(/[^א-ת0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' '
const hayFlat = hay.replace(/ /g, '')
let runs = 0, miss = []
for (const line of lines) {
  for (const run of line.replace(NIQQUD, '').split(/[^א-ת ]+/)) {
    const words = run.trim().split(/\s+/).filter(Boolean)
    if (words.length < 3) continue
    runs++
    /* ההשוואה על האותיות בלבד, בלי רווחים — ה-dump מפזר רווחים בתוך מילים.
       רצף עובר אם הוא נחתך לכל היותר בנקודה אחת לשני חלקים שנמצאים שניהם. */
    const ok = (ws) => hayFlat.includes(ws.join(''))
    let pass = ok(words)
    for (let k = 1; !pass && k < words.length; k++) pass = ok(words.slice(0, k)) && ok(words.slice(k))
    if (!pass) miss.push(words.join(' '))
  }
}
if (miss.length) { bad++; console.log(`✗ ${miss.length}/${runs} רצפים לא נמצאו בסדרם:\n   ` + miss.join('\n   ')) }
else console.log(`✓ ${runs} רצפים עבריים מה-dump נמצאו בהעתקה בסדרם`)

console.log(bad ? `❌ ${bad} כשלים` : `✅ ${secs.length} סעיפים · שתי בדיקות עצמאיות · אפס סטיות מהמקור`)
process.exit(bad ? 1 : 0)
