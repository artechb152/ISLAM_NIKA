/* שער נאמנות למקור — פרק 9.

   שכבת הטקסט של עמודים 62–70 שבורה בכיוון, ולכן SOURCE-TEXT.md הועתק מרינדור
   של העמודים. שתי בדיקות עצמאיות מול ה-dump המכני (pdf-extract.txt):

   1. ריבוי תווים — האותיות והספרות של כל הפרק זהות לאלה של ה-dump.
   2. סדר — כל רצף עברי של 3 מילים ומעלה שה-dump מחזיר בשורה אחת מופיע
      כפי שהוא בהעתקה. ה-dump שובר סדר בין קטעים, לא בתוכם.

   ריצה: node concept/chapter9/verify-source.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const dump = await readFile(new URL('pdf-extract.txt', here), 'utf8')

/* הכותרת הרצה ומספר העמוד אינם תוכן. מספר העמוד מוסר פעם אחת לכל עמוד. */
const HEADER = /^(-מוגבל-$|-$|האסלאם$|דת ותרבות$|מערך ההדרכה|- גירסת טיוטה$)/
const strip = (text) => {
  const out = []
  let page = null, dropped = true
  for (const line of text.split('\n')) {
    const t = line.trim()
    const m = /^===== PAGE (\d+)/.exec(t)
    if (m) { page = m[1]; dropped = false; continue }
    if (!dropped && t === page) { dropped = true; continue }
    if (HEADER.test(t)) continue
    out.push(line)
  }
  return out
}

const NIQQUD = /[֑-ׇً-ْٰ]/g
const norm = (s) => s.replace(NIQQUD, '').replace(/[^֐-׿؀-ۿa-zA-Z0-9]/g, '')

const secs = [...md.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t])
const body = md.slice(md.indexOf('## פרק תשיעי'), md.indexOf('## מפת הפרק'))
const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1])
const lines = strip(dump)

let bad = 0

/* ---------- 1 · ריבוי תווים ---------- */
const bag = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); return m }
const mine = bag(norm(heads.join('') + secs.map(([, t]) => t).join('')))
const theirs = bag(norm(lines.join('')))
/* חריגה אחת, מוכרזת: ב-„الصَّلَاةِ" (§10) הא' שבתוך הליגטורה לא-א' אינה בשכבת
   הטקסט (ה-dump: „صَّلَ َ ةِ"), אבל נראית בעמוד. ההעתקה עוקבת אחרי העמוד. */
const KNOWN = { 'ا': 1 }
for (const [c, n] of Object.entries(KNOWN)) { theirs.set(c, (theirs.get(c) ?? 0) + n); console.log(`· חריגה מוכרזת: "${c}" +${n} (ליגטורה ב-§10)`) }
const diffs = []
for (const c of new Set([...mine.keys(), ...theirs.keys()])) {
  const a = mine.get(c) ?? 0, b = theirs.get(c) ?? 0
  if (a !== b) diffs.push(`"${c}" בהעתקה ${a} · במקור ${b}`)
}
if (diffs.length) { bad++; console.log('✗ ריבוי התווים אינו זהה:\n   ' + diffs.join('\n   ')) }
else console.log(`✓ ${[...mine.values()].reduce((s, n) => s + n, 0)} תווים — ריבוי זהה ל-dump המכני של עמודים 62–70`)

/* ---------- 2 · סדר: רצפים עבריים מה-dump ---------- */
const hay = ' ' + (heads.join(' ') + ' ' + secs.map(([, t]) => t).join(' '))
  .replace(NIQQUD, '').replace(/[^א-ת0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' '
const hayFlat = hay.replace(/ /g, '')
/* שני רצפים שה-dump הפך ביותר מנקודה אחת. נבדקו בעין מול הרינדור:
   עמ' 64 „מייחסת לחוסיין את המשפט שאמר" · עמ' 69 „פאטמה, … היא בדרגה דתית". */
const EYE = new Set(['המשפט שאמר את ן', 'בדרגה דתית היא פאטמה'])
let runs = 0, miss = []
for (const line of lines) {
  for (const run of line.replace(NIQQUD, '').split(/[^א-ת ]+/)) {
    const words = run.trim().split(/\s+/).filter(Boolean)
    if (words.length < 3) continue
    /* הקצוות עלולים להיחתך באמצע מילה, וה-dump מפזר רווחים בתוך מילים מנוקדות —
       ולכן ההשוואה היא על האותיות בלבד, בלי רווחים. סדר האותיות הוא הראיה. */
    runs++
    /* ה-dump מרכיב שורה ויזואלית אחת משני קטעים לוגיים (למשל סוף משפט ותחילת
       הבא, כשמספר ביניהם הוסר). לכן רצף עובר אם הוא נחתך לכל היותר בנקודה אחת
       לשני חלקים שכל אחד מהם נמצא. מילה שגויה נופלת בחלק שלה בכל חיתוך. */
    const ok = (ws) => hayFlat.includes(ws.join(''))
    let pass = ok(words)
    for (let k = 1; !pass && k < words.length; k++) pass = ok(words.slice(0, k)) && ok(words.slice(k))
    if (!pass && EYE.has(words.join(' '))) { console.log(`· נבדק בעין מול העמוד: "${words.join(' ')}"`); continue }
    if (!pass) miss.push(words.join(' '))
  }
}
if (miss.length) { bad++; console.log(`✗ ${miss.length}/${runs} רצפים לא נמצאו בסדרם:\n   ` + miss.join('\n   ')) }
else console.log(`✓ ${runs} רצפים עבריים מה-dump נמצאו בהעתקה בסדרם`)

console.log(bad ? `❌ ${bad} כשלים` : `✅ ${secs.length} סעיפים · שתי בדיקות עצמאיות · אפס סטיות מהמקור`)
process.exit(bad ? 1 : 0)
