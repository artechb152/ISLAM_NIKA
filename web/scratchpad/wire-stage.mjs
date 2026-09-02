import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
s = s.replace('/** A plate: one painted view', fs.readFileSync('scratchpad/stage.txt', 'utf8') + '\n/** A plate: one painted view')

const I = ' '.repeat(16)
/* 01 — הבמה היחידה במסך מלא. חמש פעימות, חמישה נכסים שנוצרו בשבילה. */
const migrateFrom = `${I}<Head id="hijra" />
${I}<T r="§0.a" className="ch4-body" reveal />
${I}<Statement r="§0.b" />
${I}<T r="§1.a" className="ch4-body" em={["ית'רב"]} reveal />
${I}<T r="§1.b" className="ch4-body" reveal />
${I}<Journey />`
if (!s.includes(migrateFrom)) throw new Error('migration anchor missing')
s = s.replace(
  migrateFrom,
  `${I}<Head id="hijra" />
${I}<Stage
${I}  label="ההגירה למדינה"
${I}  beats={[
${I}    { img: 'stage-1-mecca', r: ['§0.a', '§0.b'], label: 'מכה' },
${I}    { img: 'stage-2-road', r: '§1.a', label: 'הדרך' },
${I}    { img: 'stage-3-night', r: ['§2.flight', '§2.invited'], label: 'שתי גרסאות' },
${I}    { img: 'stage-4-arrival', r: '§1.b', label: "ית'רב" },
${I}    { img: 'stage-5-yard', r: ['§7.a', '§7.b', '§7.c'], label: 'המסגד' },
${I}  ]}
${I}/>`,
)

/* המפה יורדת מ-01. היא נדחתה, ותצויר מחדש כקלף. */
s = s.replace(`${I}<Plate src="yathrib-oasis" />\n`, '')

/* 02 — §2 ו-§7 עברו לבמה, אז שורותיהם הישנות יורדות */
const dropped = [
  `${I}<div className="ch4-two" data-reveal>\n${I}  <T r="§2.flight" className="ch4-body ch4-two-side" />\n${I}  <T r="§2.invited" className="ch4-body ch4-two-side" />\n${I}</div>\n`,
  `${I}<T r="§7.a" className="ch4-body" reveal />\n`,
  `${I}<T r="§7.b" className="ch4-body" reveal />\n`,
  `${I}<T r="§7.c" className="ch4-body" reveal />\n`,
  `${I}<Plate src="mosque-courtyard" />\n`,
]
for (const d of dropped) {
  if (!s.includes(d)) console.log('  (כבר לא קיים)', d.trim().slice(0, 46))
  s = s.split(d).join('')
}

/* 05 — אותו מנגנון, לבוש אחר: כלוא בעמודה, הכיתוב מתחת לתמונה */
const siegeFrom = `${I}<T r="§23.a" className="ch4-body" reveal />`
if (!s.includes(siegeFrom)) throw new Error('siege anchor missing')
s = s.replace(
  siegeFrom,
  `${I}<Stage
${I}  variant="inset"
${I}  label="קרב השוחה"
${I}  beats={[
${I}    { img: 'siege-1-open', r: '§23.a', label: 'המצור' },
${I}    { img: 'siege-2-digging', r: '§24.trench', label: 'החפירה' },
${I}    { img: 'siege-3-finished', r: '§25.a', label: 'המחנות' },
${I}    { img: 'siege-4-storm', r: '§24.storm', label: 'הסערה' },
${I}  ]}
${I}/>`,
)
const drop2 = [
  `${I}<Trench r="§24.trench" />\n`,
  `${I}<T r="§24.storm" className="ch4-body" reveal />\n`,
  `${I}<T r="§25.a" className="ch4-body" em={['אלאחזאב']} reveal />\n`,
]
for (const d of drop2) {
  if (!s.includes(d)) console.log('  (כבר לא קיים)', d.trim().slice(0, 46))
  s = s.split(d).join('')
}
fs.writeFileSync(p, s)
console.log('stages:', (s.match(/<Stage/g) || []).length)
