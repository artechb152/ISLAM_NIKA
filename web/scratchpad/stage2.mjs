import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')

/* מחליפים את גוף הרכיב הישן */
const a = s.indexOf('/* ---------------- mechanism · the stage ----------------')
const anchor = '\n/** A plate: one painted view'
const b = s.indexOf(anchor, a)
if (a < 0 || b < 0) throw new Error('stage block not found')
s = s.slice(0, a) + fs.readFileSync('scratchpad/stage2.txt', 'utf8') + s.slice(b)

const I = ' '.repeat(16)

/* 01 — חמש פעימות, כל אחת עם משפט ראשי, המשך, כיתוב וצ'יפים */
const oldMigrate = new RegExp(
  `${I}<Stage\\n${I}  label="ההגירה למדינה"[\\s\\S]*?${I}/>\\n${I}<T r="§7\\.b"[\\s\\S]*?${I}</div>`,
)
if (!oldMigrate.test(s)) throw new Error('migration stage anchor missing')
s = s.replace(
  oldMigrate,
  `${I}<Stage
${I}  label="ההגירה למדינה"
${I}  beats={[
${I}    {
${I}      img: 'stage-1-mecca',
${I}      r: '§0.a',
${I}      note: ['§0.b'],
${I}      caption: 'מכה בעמקה, מבט מן המעבר היוצא צפונה · שחזור מצויר',
${I}      chips: ['מכה'],
${I}      label: 'מכה',
${I}    },
${I}    {
${I}      img: 'stage-2-road',
${I}      r: '§1.a',
${I}      caption: 'דרך השיירות צפונה, בשעת הצהריים · שחזור מצויר',
${I}      chips: ["ית'רב"],
${I}      label: 'הדרך',
${I}    },
${I}    {
${I}      img: 'stage-3-night',
${I}      r: '§2.flight',
${I}      note: ['§2.invited'],
${I}      caption: 'הדרך בלילה, בין שני רכסים · שחזור מצויר',
${I}      label: 'שתי גרסאות',
${I}    },
${I}    {
${I}      img: 'stage-4-arrival',
${I}      r: '§1.b',
${I}      caption: 'שער נווה מדבר בין חומות גן ודקלים · שחזור מצויר',
${I}      chips: ['בני נדיר'],
${I}      label: "ית'רב",
${I}    },
${I}    {
${I}      img: 'stage-5-yard',
${I}      r: '§7.a',
${I}      note: ['§7.b', '§7.c'],
${I}      caption: 'חצר עם גזעי דקל כרותים, לפני שנבנה המסגד · שחזור מצויר',
${I}      chips: ['מדינה'],
${I}      label: 'המסגד',
${I}    },
${I}  ]}
${I}/>`,
)

/* 05 — אותו מנגנון, לבוש כלוא */
const oldSiege = new RegExp(`${I}<Stage\\n${I}  variant="inset"[\\s\\S]*?${I}/>`)
if (!oldSiege.test(s)) throw new Error('siege stage anchor missing')
s = s.replace(
  oldSiege,
  `${I}<Stage
${I}  variant="inset"
${I}  label="קרב השוחה"
${I}  beats={[
${I}    {
${I}      img: 'siege-1-open',
${I}      r: '§23.a',
${I}      note: ['§23.cause1', '§23.cause2'],
${I}      caption: 'הקרקע הפתוחה שלפני העיר · שחזור מצויר',
${I}      chips: ['מדינה'],
${I}      label: 'המצור',
${I}    },
${I}    {
${I}      img: 'siege-2-digging',
${I}      r: '§24.trench',
${I}      caption: 'תעלה בחפירה, סלים ומכוש · שחזור מצויר',
${I}      chips: ['סלמאן אלפראסי'],
${I}      label: 'החפירה',
${I}    },
${I}    {
${I}      img: 'siege-3-finished',
${I}      r: '§25.a',
${I}      caption: 'התעלה הגמורה, ומחנות מעברה · שחזור מצויר',
${I}      label: 'המחנות',
${I}    },
${I}    {
${I}      img: 'siege-4-storm',
${I}      r: '§24.storm',
${I}      caption: 'סערה על המישור בלילה · שחזור מצויר',
${I}      label: 'הסערה',
${I}    },
${I}  ]}
${I}/>`,
)

/* §23.cause1/2 עברו לתוך הבמה — השורות הישנות יורדות */
const drop = `${I}<div className="ch4-two" data-reveal>\n${I}  <T r="§23.cause1" className="ch4-body ch4-two-side" />\n${I}  <T r="§23.cause2" className="ch4-body ch4-two-side" />\n${I}</div>\n`
if (s.includes(drop)) s = s.replace(drop, '')
else console.log('  (שורות הסיבות לא נמצאו — ייתכן שכבר ירדו)')

fs.writeFileSync(p, s)
console.log('stage rebuilt · stages:', (s.match(/<Stage/g) || []).length)
