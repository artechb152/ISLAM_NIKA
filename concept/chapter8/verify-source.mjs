/* שער נאמנות למקור — פרק 8.

   שכבת הטקסט של עמודים 56–61 שבורה בכיוון (סדר ויזואלי הפוך, רווחים בתוך
   מילים, שורות מפורקות לשברים), ולכן SOURCE-TEXT.md הועתק מרינדור של העמודים.
   לפרק הזה אין חילוץ עצמאי בסדר תקין, ולכן שתי הבדיקות נשענות על השכבה
   הגולמית (pdf-extract.txt), כל אחת מזווית אחרת:

   1. ריבוי תווים לכל עמוד בנפרד — ההעתקה נחתכת בעוגני תחילת העמוד שלמטה.
      אות שנוספה או נשמטה מפילה את השער ומצביעה על העמוד.
   2. כל שבר של השכבה (מילה של ארבע אותיות ומעלה) נמצא כתת-מחרוזת בהעתקה של
      אותו עמוד. השכבה שוברת את סדר השורות, לא את סדר האותיות בתוך מילה — וזה
      תופס מילה שהוחלפה באחרת עם אותן אותיות, שבדיקה 1 לבדה מפספסת.

   ריצה: node concept/chapter8/verify-source.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const dump = await readFile(new URL('pdf-extract.txt', here), 'utf8')

/* המילים הראשונות של כל עמוד, כפי שהן בהעתקה. עמוד 56 מתחיל בכותרת הפרק. */
const PAGE_STARTS = {
  57: 'הקוראן לא כתוב בצורה כרונולוגית',
  58: 'נהוג לומר כי פרשות אלו ירדו בתקופה שעדיין',
  59: 'אם קיים חדית\' שמוחמד אמר',
  60: 'היא "חסן" כלומר טוב',
  61: 'העץ והאבן למוסלמי',
}

/* הכותרת הרצה מופיעה בראש כל עמוד ואינה תוכן. נמחקת רק בשמונה השורות הראשונות
   של כל עמוד ורק בהתאמה מלאה — שורת גוף שמתחילה ב„האסלאם“ אינה כותרת. */
const HEADER = new Set(['-מוגבל-', 'דת ותרבות', '-', 'האסלאם', 'מערך ההדרכה אמ”ן', '- גירסת טיוטה'])
const pagesRaw = {}
{
  let page = null, n = 0
  for (const line of dump.split('\n')) {
    const t = line.trim()
    const m = /^===== PAGE (\d+) =====$/.exec(t)
    if (m) { page = +m[1]; n = 0; pagesRaw[page] = []; continue }
    n++
    if (n <= 8 && (HEADER.has(t) || t === String(page))) continue
    pagesRaw[page].push(line)
  }
}

/* מסירים ניקוד, ואז כל מה שאינו אות או ספרה — הפיסוק זז בין הכיוונים ואינו ראיה */
const norm = (s) => s.replace(/[֑-ׇً-ْ]/g, '').replace(/[^֐-׿؀-ۿa-zA-Z0-9]/g, '')

/* ההעתקה בסדר הקריאה: כל כותרת ## וכל §, עד מפת הפרק */
const body = md.slice(md.indexOf('\n---\n') + 5, md.indexOf('## מפת הפרק'))
const stream = body.split('\n').filter((l) => l.trim() && !/^### §/.test(l))
  .map((l) => l.replace(/^## /, '')).join('\n')

const mine = {}
{
  let rest = stream
  const pages = Object.keys(PAGE_STARTS).map(Number)
  let cur = 56
  for (const p of pages) {
    const at = rest.indexOf(PAGE_STARTS[p])
    if (at === -1) { console.log(`✗ עוגן עמוד ${p} לא נמצא בהעתקה: "${PAGE_STARTS[p]}"`); process.exit(1) }
    mine[cur] = rest.slice(0, at); rest = rest.slice(at); cur = p
  }
  mine[cur] = rest
}

let bad = 0

/* ---------- 1 · ריבוי תווים, עמוד-עמוד ---------- */
const bag = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); return m }
let total = 0
for (const p of Object.keys(mine).map(Number)) {
  const a = bag(norm(mine[p])), b = bag(norm(pagesRaw[p].join('\n')))
  const diffs = []
  for (const c of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(c) ?? 0, y = b.get(c) ?? 0
    if (x !== y) diffs.push(`"${c}" בהעתקה ${x} · בשכבה ${y}`)
  }
  total += norm(mine[p]).length
  if (diffs.length) { bad++; console.log(`✗ עמוד ${p}: ריבוי התווים אינו זהה\n   ` + diffs.join('\n   ')) }
}
if (!bad) console.log(`✓ ${total} תווים — ריבוי זהה לשכבת הטקסט, בכל אחד משישה עמודים בנפרד`)

/* ---------- 2 · כל שבר של השכבה נמצא בעמוד שלו ---------- */
const before = bad
let checked = 0
for (const p of Object.keys(mine).map(Number)) {
  const hay = norm(mine[p]).replace(/\d/g, '')
  for (const line of pagesRaw[p]) {
    for (const tok of line.split(/\s+/)) {
      const t = norm(tok).replace(/\d/g, '')
      if (t.length < 4) continue
      checked++
      if (!hay.includes(t)) { bad++; console.log(`✗ עמוד ${p}: השבר "${t}" (מהשורה "${line.trim()}") לא נמצא בהעתקה`) }
    }
  }
}
if (bad === before) console.log(`✓ ${checked} שברים של השכבה — כולם נמצאו, כל אחד בעמוד שלו`)

const secs = [...md.matchAll(/^### (§\d+)$/gm)].length
console.log(bad ? `❌ ${bad} כשלים` : `✅ ${secs} סעיפים · שתי בדיקות עצמאיות · אפס סטיות מהמקור`)
process.exit(bad ? 1 : 0)
