import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
s = s.replace('/** A plate: one painted view', fs.readFileSync('scratchpad/band.txt', 'utf8') + '\n/** A plate: one painted view')

const I = ' '.repeat(16)
const swap = (from, to) => {
  if (!s.includes(from)) throw new Error('חסר עוגן: ' + from.trim().slice(0, 52))
  s = s.replace(from, to)
}

/* 01 — שלושת הלוחות של הפתיחה הופכים לרצועות */
swap(
  [
    `${I}<T r="§0.a" className="ch4-body" reveal />`,
    `${I}<T r="§0.b" className="ch4-body" reveal />`,
    `${I}<Plate src="stage-1-mecca" />`,
    `${I}<T r="§1.a" className="ch4-body" em={["ית'רב"]} reveal />`,
    `${I}<T r="§1.b" className="ch4-body" reveal />`,
    `${I}<Plate src="stage-4-arrival" />`,
  ].join('\n'),
  [
    `${I}<Band img="stage-1-mecca" caption="מכה בעמקה · שחזור מצויר">`,
    `${I}  <T r="§0.a" className="ch4-body" />`,
    `${I}  <T r="§0.b" className="ch4-body" />`,
    `${I}</Band>`,
    `${I}<Band img="stage-4-arrival" caption="שער הנווה · שחזור מצויר" flip>`,
    `${I}  <T r="§1.a" className="ch4-body" em={["ית'רב"]} />`,
    `${I}  <T r="§1.b" className="ch4-body" />`,
    `${I}</Band>`,
  ].join('\n'),
)

/* המסגד בסוף המקטע */
swap(
  [
    `${I}<Plate src="yathrib-oasis" />`,
    `${I}<T r="§7.a" className="ch4-body" reveal />`,
    `${I}<T r="§7.b" className="ch4-body" reveal />`,
    `${I}<T r="§7.c" className="ch4-body" reveal />`,
    `${I}<Plate src="stage-5-yard" />`,
  ].join('\n'),
  [
    `${I}<Band img="stage-5-yard" caption="החצר לפני שנבנה המסגד · שחזור מצויר">`,
    `${I}  <T r="§7.a" className="ch4-body" />`,
    `${I}  <T r="§7.b" className="ch4-body" />`,
    `${I}  <T r="§7.c" className="ch4-body" />`,
    `${I}</Band>`,
  ].join('\n'),
)

/* שאר הלוחות בפרק הופכים לרצועות, לסירוגין */
const rest = [
  ['uhud-mount', 'הר אֻחֻד מן המישור · שחזור מצויר', false],
  ['hudaybiyyah-plain', 'המישור שבו נעצר · שחזור מצויר', true],
  ['khaybar-forts', 'מבצרי ח\'יבר מעל המטעים · שחזור מצויר', false],
  ['kaaba-precinct', 'מתחם הכעבה בשחר · שחזור מצויר', true],
  ['medina-dusk', 'מדינה בין ערביים · שחזור מצויר', false],
]
for (const [img, caption, flip] of rest) {
  const from = `${I}<Plate src="${img}" />`
  if (!s.includes(from)) {
    console.log('  (אין לוח)', img)
    continue
  }
  s = s.replace(from, `${I}<Band img="${img}" caption="${caption}"${flip ? ' flip' : ''} />`)
}

fs.writeFileSync(p, s)
console.log('bands:', (s.match(/<Band /g) || []).length, '· plates left:', (s.match(/<Plate src=/g) || []).length)
