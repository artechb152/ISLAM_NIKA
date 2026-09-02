import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
const I = ' '.repeat(16)

/* פעימה אחת = משפט אחד. §0.a+§0.b יחד היו 32 מילים על תמונה, וזה קיר ולא
   שורת תצוגה. §2 ו-§7.b–c חוזרים לטקסט מתחת לבמה — שם הם נקראים, כאן הם
   היו מאריכים כל פעימה מעבר למה שאפשר לקרוא בהצצה. */
const from = `${I}    { img: 'stage-1-mecca', r: ['§0.a', '§0.b'], label: 'מכה' },
${I}    { img: 'stage-2-road', r: '§1.a', label: 'הדרך' },
${I}    { img: 'stage-3-night', r: ['§2.flight', '§2.invited'], label: 'שתי גרסאות' },
${I}    { img: 'stage-4-arrival', r: '§1.b', label: "ית'רב" },
${I}    { img: 'stage-5-yard', r: ['§7.a', '§7.b', '§7.c'], label: 'המסגד' },`
if (!s.includes(from)) throw new Error('beats anchor missing')
s = s.replace(
  from,
  `${I}    { img: 'stage-1-mecca', r: '§0.a', label: 'מכה' },
${I}    { img: 'stage-2-road', r: '§0.b', label: 'שתים־עשרה שנים' },
${I}    { img: 'stage-3-night', r: '§1.a', label: 'הדרך' },
${I}    { img: 'stage-4-arrival', r: '§1.b', label: "ית'רב" },
${I}    { img: 'stage-5-yard', r: '§7.a', label: 'המסגד' },`,
)

/* מה שיצא מהבמה חוזר כטקסט מיד אחריה */
const after = `${I}/>`
const idx = s.indexOf(from.slice(0, 40)) >= 0 ? -1 : s.indexOf(`{ img: 'stage-5-yard'`)
const closeAt = s.indexOf(`${I}/>`, idx)
if (idx < 0 || closeAt < 0) throw new Error('stage close not found')
s =
  s.slice(0, closeAt + after.length) +
  `\n${I}<T r="§7.b" className="ch4-body" reveal />\n${I}<T r="§7.c" className="ch4-body" reveal />\n${I}<div className="ch4-two" data-reveal>\n${I}  <T r="§2.flight" className="ch4-body ch4-two-side" />\n${I}  <T r="§2.invited" className="ch4-body ch4-two-side" />\n${I}</div>` +
  s.slice(closeAt + after.length)

fs.writeFileSync(p, s)
console.log('beats rebalanced')
