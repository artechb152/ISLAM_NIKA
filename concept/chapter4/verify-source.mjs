/* שער נאמנות: כל §N חייב להימצא מילה-במילה בטקסט המחולץ מה-PDF */
import fs from 'node:fs'
/* בלי ארגומנטים — שני הקבצים שליד הסקריפט, כמו בשני השערים האחרים */
const here = new URL('.', import.meta.url).pathname
const mdPath = process.argv[2] ?? here + 'SOURCE-TEXT.md'
const pdfPath = process.argv[3] ?? here + 'pdf-extract.txt'
/* התוספת של המרצה (18.9.2026) אינה מה-PDF ומוחרגת כאן במפורש — הקטע נחתך
   לפני הכותרת שלה, וההחרגה מודפסת בכל ריצה כדי שתישאר גלויה. */
const FIX_HEAD = '## תוספת · סבב התיקונים של המרצה'
/* SOURCE TYPOS CORRECTED ON 11.10.2026, approved by the owner (wording round):
   SOURCE-TEXT.md now carries the corrected spelling, the PDF still has the slip.
   Each pair is [corrected, as printed]; the check undoes them before comparing,
   so everything else still has to match the PDF letter for letter. Printed on
   every run so the deviation stays visible. */
const TYPO_FIXES = [
  [
    "וכך פתח צבאו של מוחמד בסדרה של קרבות, שמטרתם הייתה לבזוז את השלל של הכופרים ולהרוג אותם.",
    "וכך פתח צבאו של מוחמד בסדרה של קרבות, שמטרתם היו לבזוז את השלל של הכופרים ולהרוג אותם."
  ],
  [
    "מסורות רבות קיימות על קרב זה, ביניהן זו שהלוחמים המוסלמים לא רצו לצאת למלחמה מפחד פן יפסידו במלחמה.",
    "מסורות רבות קיימות על קרב זה, ביניהם זה שהלוחמים המוסלמים לא רצו לצאת למלחמה מפחד פן יפסידו במלחמה."
  ],
  [
    "מותר למוסלמי ליזום הסכם שלום בתנאי שתצמח לו ממנו תועלת (מצלחה) או ימנע ממנו נזק (מפסדה);",
    "מותר למוסלמי ליזום הסכם שלום בתנאי שתצמח לו ממנו תועלת (מצלחה) או ימנע ממנה נזק (מפסדה);"
  ],
  [
    "לאחר כיבוש מכה התאסלמו רבים מתושבי העיר, ביניהם אבו סופיאן, מי שנלחם עם מוחמד בקרבות בדר ואחד, ומוחמד טיהר את הכעבה מעבודת האלילים שהייתה בה, על ידי ניתוץ הפסילים.",
    "לאחר כיבוש מכה התאסלמו רבים מתושבי העיר, ביניהם אבו סופיאן, מי שנלחם עם מוחמד בקרבות בדר ואחד, ומוחמד טיהר את הכעבה מעבודת האלילים שהייתה בו, על ידי ניתוץ הפסילים."
  ]
]
const undoFixes = (s) => TYPO_FIXES.reduce((t, [fixed, printed]) => t.split(fixed).join(printed), s)
console.log(`⚠ ${TYPO_FIXES.length} תיקוני הקלדה מאושרים בנוסח המקור מוחזרים לנוסח ה-PDF לפני ההשוואה`)
const mdAll = undoFixes(fs.readFileSync(mdPath, 'utf8'))
const cutAt = mdAll.indexOf(FIX_HEAD)
const md = cutAt >= 0 ? mdAll.slice(0, cutAt) : mdAll
if (cutAt >= 0) {
  const extra = [...mdAll.slice(cutAt).matchAll(/^### (§\d+)/gm)].map((m) => m[1])
  console.log(`⚠ מוחרגים מהבדיקה מול ה-PDF (תוספת המרצה): ${extra.join(', ')}`)
}
/* הכותרת הרצה של החוברת נתחבת באמצע משפטים שחוצים עמוד — מסירים אותה */
const raw = fs.readFileSync(pdfPath, 'utf8').split('\n')
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
