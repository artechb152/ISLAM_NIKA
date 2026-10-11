/* שער נאמנות למקור — פרק 7.

   שכבת הטקסט של עמודים 52–55 שבורה בכיוון, ולכן SOURCE-TEXT.md הועתק מרינדור
   של העמודים. הבדיקה: ריבוי התווים של ההעתקה זהה לריבוי התווים של ה-dump
   המכני ב-pdf-extract.txt (סדר שבור, תוכן שלם). אות שנוספה או נשמטה מפילה.

   ריצה: node concept/chapter7/verify-source.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const dump = await readFile(new URL('pdf-extract.txt', here), 'utf8')

/* הכותרת הרצה ומספר העמוד מופיעים בכל עמוד ואינם תוכן. מספר העמוד מוסר פעם אחת
   בלבד — שורה שכולה ספרות היא לרוב מספר שהכיווניות הדפה משורתה (29, 2026). */
const HEADER = /^(=====|-מוגבל-$|-$|האסלאם$|דת ותרבות$|מערך ההדרכה|- גירסת טיוטה$)/
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
  return out.join('\n')
}

/* ניקוד עברי, חרכאת ערביות (כולל שדה ואלף זעירה) — ואז כל מה שאינו אות או ספרה */
const norm = (s) => s.replace(/[֑-ׇً-ْٰ]/g, '').replace(/[^֐-׿؀-ۿa-zA-Z0-9]/g, '')

const secs = [...md.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t])
const heads = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((h) => !/^מפת הפרק|^הערות עריכה/.test(h))

let bad = 0
const ids = secs.map(([id]) => id)
const expect = ids.map((_, i) => '§' + i)
if (ids.join() !== expect.join()) { bad++; console.log('✗ מספור הסעיפים אינו רציף: ' + ids.join(' ')) }

/* שלוש אותיות שהגופן של החוברת מצייר כליגטורה, ושכבת הטקסט מאבדת — נבדק בנקודות
   הקוד של ה-dump (שורות 102, 106, 113): „اللَّهِ“ יוצא ‎ا ل ل ّ‎ בלי ه, פעמיים
   ב-§3, ו„الْأَرْضَ“ יוצא בלי ה-أ שבתוך הלאם-אלף. ההעתקה נכונה והמקור חסר; הסטייה
   מותרת **רק בדיוק במספרים האלה**, וכל סטייה אחרת — או שינוי בהן — מפילה. */
const LIGATURE = new Map([['ه', 2], ['أ', 1]])

const bag = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); return m }
const mine = bag(norm(heads.join('') + secs.map(([, t]) => t).join('')))
const theirs = bag(norm(strip(dump)))
const diffs = []
for (const c of new Set([...mine.keys(), ...theirs.keys()])) {
  const a = mine.get(c) ?? 0, b = (theirs.get(c) ?? 0) + (LIGATURE.get(c) ?? 0)
  if (a !== b) diffs.push(`"${c}" U+${c.codePointAt(0).toString(16)} בהעתקה ${a} · במקור ${b}`)
}
if (diffs.length) { bad++; console.log('✗ ריבוי התווים אינו זהה:\n   ' + diffs.join('\n   ')) }
else console.log(`✓ ${[...mine.values()].reduce((s, n) => s + n, 0)} תווים — ריבוי זהה ל-dump המכני של עמודים 52–55 (ועוד 3 אותיות ליגטורה שה-dump מאבד)`)

console.log(bad ? `❌ ${bad} כשלים` : `✅ ${secs.length} סעיפים · אפס סטיות מהמקור`)
process.exit(bad ? 1 : 0)
