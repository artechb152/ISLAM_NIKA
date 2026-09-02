import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
const I = ' '.repeat(16)

/* מוציאים את הבמה מהפתיחה. המשפטים שלה חוזרים לטקסט רץ עם שלושה לוחות
   לצידם, והציורים שנוצרו לפעימות ממשיכים לשרת אותם. */
const stageRe = new RegExp(`${I}<Stage\\n${I}  label="ההגירה למדינה"[\\s\\S]*?\\n${I}/>`)
if (!stageRe.test(s)) throw new Error('migration stage not found')
s = s.replace(
  stageRe,
  [
    `${I}<T r="§0.a" className="ch4-body" reveal />`,
    `${I}<T r="§0.b" className="ch4-body" reveal />`,
    `${I}<Plate src="stage-1-mecca" />`,
    `${I}<T r="§1.a" className="ch4-body" em={["ית'רב"]} reveal />`,
    `${I}<T r="§1.b" className="ch4-body" reveal />`,
    `${I}<Plate src="stage-4-arrival" />`,
    `${I}<div className="ch4-two" data-reveal>`,
    `${I}  <T r="§2.flight" className="ch4-body ch4-two-side" />`,
    `${I}  <T r="§2.invited" className="ch4-body ch4-two-side" />`,
    `${I}</div>`,
  ].join('\n'),
)

/* §7 חוזר לסוף המקטע, עם החצר שלו */
const mosqueAnchor = `${I}<Plate src="yathrib-oasis" />`
if (!s.includes(mosqueAnchor)) throw new Error('yathrib plate anchor missing')
s = s.replace(
  mosqueAnchor,
  [
    mosqueAnchor,
    `${I}<T r="§7.a" className="ch4-body" reveal />`,
    `${I}<T r="§7.b" className="ch4-body" reveal />`,
    `${I}<T r="§7.c" className="ch4-body" reveal />`,
    `${I}<Plate src="stage-5-yard" />`,
  ].join('\n'),
)

/* הבמה היחידה שנשארה עוברת ללבוש הרחב — היא כבר לא בפתיחה */
s = s.replace(`${I}<Stage\n${I}  variant="inset"`, `${I}<Stage`)

fs.writeFileSync(p, s)
console.log('stages left:', (s.match(/<Stage/g) || []).length, '· plates:', (s.match(/<Plate src=/g) || []).length)
