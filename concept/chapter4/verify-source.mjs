/* שער נאמנות: כל §N חייב להימצא מילה-במילה בטקסט המחולץ מה-PDF */
import fs from 'node:fs'
/* התוספת של המרצה (18.9.2026) אינה מה-PDF ומוחרגת כאן במפורש — הקטע נחתך
   לפני הכותרת שלה, וההחרגה מודפסת בכל ריצה כדי שתישאר גלויה. */
const FIX_HEAD = '## תוספת · סבב התיקונים של המרצה'
const mdAll = fs.readFileSync(process.argv[2], 'utf8')
const cutAt = mdAll.indexOf(FIX_HEAD)
const md = cutAt >= 0 ? mdAll.slice(0, cutAt) : mdAll
if (cutAt >= 0) {
  const extra = [...mdAll.slice(cutAt).matchAll(/^### (§\d+)/gm)].map((m) => m[1])
  console.log(`⚠ מוחרגים מהבדיקה מול ה-PDF (תוספת המרצה): ${extra.join(', ')}`)
}
/* הכותרת הרצה של החוברת נתחבת באמצע משפטים שחוצים עמוד — מסירים אותה */
const raw = fs.readFileSync(process.argv[3], 'utf8').split('\n')
  .filter((l) => !/^===== PAGE|^\d+$|^-מוגבל-$|^האסלאם - דת ותרבות$|^גירסת טיוטה - מערך ההדרכה/.test(l.trim()))
  .join('\n')
const norm = (s) => s.replace(/[֑-ׇً-ْ]/g, '').replace(/[^֐-׿؀-ۿa-zA-Z0-9]/g, '')
const body = norm(raw)
const secs = [...md.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)]
let bad = 0
for (const [, id, text] of secs) {
  const n = norm(text)
  if (body.includes(n)) continue
  bad++
  let lo = 0, hi = n.length
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (body.includes(n.slice(0, mid))) lo = mid; else hi = mid - 1 }
  console.log(`✗ ${id} נשבר אחרי ${lo}/${n.length}: "...${n.slice(Math.max(0, lo - 25), lo)}" ‖ ואז "${n.slice(lo, lo + 25)}"`)
}
console.log(bad === 0 ? `✓ כל ${secs.length} הסעיפים נמצאו מילה-במילה במקור` : `✗ ${bad}/${secs.length} סעיפים לא תואמים`)
process.exit(bad ? 1 : 0)
