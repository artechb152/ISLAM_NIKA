/* שער נאמנות למקור — פרק 5.

   שכבת הטקסט של עמודים 40–43 שבורה בכיוון (סדר ויזואלי הפוך, רווחים בתוך
   מילים, ספרות מתהפכות), ולכן SOURCE-TEXT.md הועתק מרינדור של העמודים.
   העתקה בעין דורשת שתי בדיקות עצמאיות, ואלה הן:

   1. מילה-במילה מול חילוץ עצמאי — עמודים 40–41 חולצו בסדר קריאה תקין, בכלי
      אחר, לתוך ../chapter4/pdf-extract.txt (החילוץ של פרק 4 גלש). §0–§4
      נבדקים מולו במלואם, ו-§5 עד הנקודה שבה אותו חילוץ נגמר.
   2. ריבוי תווים מול ה-dump המכני — ל-pdf-extract.txt של פרק 5 יש סדר שבור
      אבל תוכן שלם. אות שנוספה או נשמטה בהעתקה מפילה את השער.

   ריצה: node concept/chapter5/verify-source.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const dump = await readFile(new URL('pdf-extract.txt', here), 'utf8')
const ch4 = await readFile(new URL('../chapter4/pdf-extract.txt', here), 'utf8')

/* הכותרת הרצה של החוברת מופיעה בכל עמוד ואינה תוכן */
/* הכותרת הרצה מופיעה בכל עמוד ואינה תוכן. מספר העמוד מוסר פעם אחת בלבד לכל
   עמוד — שורה שכולה ספרות היא לרוב שנה שהכיווניות הדפה משורתה (622, 634), ומסנן
   גס היה בולע אותה ומסתיר בדיוק את מה שהשער אמור לתפוס. */
const HEADER = /^(=====|-מוגבל-$|-$|האסלאם|דת ותרבות$|האסלאם - דת ותרבות$|מערך ההדרכה|- גירסת טיוטה$|גירסת טיוטה - מערך ההדרכה)/
const strip = (text) => {
  const out = []
  let page = null, dropped = true
  for (const line of text.split('\n')) {
    const t = line.trim()
    const m = /^===== (?:PAGE|INDEX) (\d+)/.exec(t)
    if (m) { page = m[1]; dropped = false; continue }
    if (!dropped && t === page) { dropped = true; continue }
    if (HEADER.test(t)) continue
    out.push(line)
  }
  return out.join('\n')
}

/* מסירים ניקוד, ואז כל מה שאינו אות או ספרה — הפיסוק זז בין הכיוונים ואינו ראיה */
const norm = (s) => s.replace(/[֑-ׇً-ْ]/g, '').replace(/[^֐-׿؀-ۿa-zA-Z0-9]/g, '')
/* לבדיקה 1 בלבד: הכיווניות הופכת סדרות ספרות („632-634“ יוצא „-632 346“), ולכן
   כל רצף ספרות מושווה כרב-קבוצה. אות אחת שהשתנתה עדיין מפילה. */
const normNum = (s) => norm(s).replace(/\d+/g, (d) => [...d].sort().join(''))

const secs = [...md.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t])
const heads = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((h) => !/^מפת הפרק|^הערות עריכה/.test(h))

let bad = 0

/* ---------- 1 · מילה-במילה מול החילוץ העצמאי (עמ' 40–41) ---------- */
const indep = normNum(strip(ch4.slice(ch4.indexOf('===== PAGE 40 ====='))))
const STRICT = ['§0', '§1', '§2', '§3', '§4']
const PARTIAL = '§5'
for (const [id, text] of secs) {
  if (!STRICT.includes(id) && id !== PARTIAL) continue
  const n = normNum(text)
  if (indep.includes(n)) continue
  /* הקידומת הארוכה ביותר שכן נמצאה */
  let lo = 0, hi = n.length
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (indep.includes(n.slice(0, mid))) lo = mid; else hi = mid - 1 }
  if (id === PARTIAL && lo > 0 && indep.endsWith(n.slice(0, lo))) {
    console.log(`· ${id}: ${lo}/${n.length} תווים נבדקו מול החילוץ העצמאי — שם הוא נגמר. השאר מוחזק בבדיקה 2.`)
    continue
  }
  bad++
  console.log(`✗ ${id} נשבר אחרי ${lo}/${n.length}: "…${n.slice(Math.max(0, lo - 25), lo)}" ‖ ואז "${n.slice(lo, lo + 25)}"`)
}
if (!bad) console.log(`✓ §0–§4 מילה-במילה מול חילוץ עצמאי של עמודים 40–41`)

/* ---------- 2 · ריבוי תווים על ארבעת העמודים ---------- */
const bag = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); return m }
const mine = bag(norm(heads.join('') + secs.map(([, t]) => t).join('')))
const theirs = bag(norm(strip(dump)))
const diffs = []
for (const c of new Set([...mine.keys(), ...theirs.keys()])) {
  const a = mine.get(c) ?? 0, b = theirs.get(c) ?? 0
  if (a !== b) diffs.push(`"${c}" בהעתקה ${a} · במקור ${b}`)
}
if (diffs.length) { bad++; console.log('✗ ריבוי התווים אינו זהה:\n   ' + diffs.join('\n   ')) }
else console.log(`✓ ${[...mine.values()].reduce((s, n) => s + n, 0)} תווים — ריבוי זהה ל-dump המכני של עמודים 40–43`)

console.log(bad ? `❌ ${bad} כשלים` : `✅ ${secs.length} סעיפים · שתי בדיקות עצמאיות · אפס סטיות מהמקור`)
process.exit(bad ? 1 : 0)
