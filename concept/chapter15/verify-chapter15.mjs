/* שער הפרק — פרק 15 · נאמנות · כיסוי · פעם אחת בדיוק.

   1. נאמנות — passages.json זהה ל-SOURCE-TEXT: הכותרת והטווח, שורת הכותרות (§0), כל שורה
      (שנה ואירוע) וכל תא גאוגרפיה עם השורות שהוא מכסה.
   2. כיסוי ופעם אחת — כל שורה יושבת במקטע אחד בדיוק, והמקטעים עוברים על §1–§23 בסדר המקור.
      כל תא גאוגרפיה כולו בתוך מקטע אחד, כך שהתווית שלו מודפסת על במה אחת בלבד.
   3. מה שעורכי נבדק מול מה שהוא טוען:
      · כותרת מקטע = השנה הראשונה שלו – השנה הגדולה בו (כלל 32: נגזר, לא מועתק);
      · קצות הציר = הטווח שבכותרת הפרק;
      · קישור לפרק — המחרוזת proof נמצאת ב-passages של אותו פרק, והנתיב קיים;
      · שם מקום על המפה — חיתוך מהאירוע של אותה שורה (כלל 27);
      · לכל תא יש מצב על המפה, ולכל צורה שהמצב מזכיר יש קואורדינטות.

   ריצה: node concept/chapter15/verify-chapter15.mjs */
import { readFile, access } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const web = new URL('../../web/', here)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const P = JSON.parse(await readFile(new URL('src/lib/chapter15/passages.json', web), 'utf8'))
const L = JSON.parse(await readFile(new URL('src/lib/chapter15/layout.json', web), 'utf8'))

let bad = 0
const fail = (m) => { bad++; console.log('✗ ' + m) }
const ok = (m) => console.log('✓ ' + m)

/* ---------- 1 · נאמנות ---------- */
const body = md.slice(md.indexOf('## פרק חמישה עשר'), md.indexOf('## הערות עריכה'))
const title = body.match(/^## פרק חמישה עשר: (.+)$/m)[1]
if (`${P.title} ${P.range}` !== title) fail(`הכותרת: "${P.title} ${P.range}" מול "${title}"`)

const src = {}
let region = null
const srcRegions = []
for (const block of body.split(/\n(?=## |### )/)) {
  const h = block.match(/^## (.+)$/m)
  if (h && !h[1].startsWith('פרק ')) { region = { text: h[1].trim(), rows: [] }; srcRegions.push(region); continue }
  const s = block.match(/^### (§\d+)\n([\s\S]*)$/)
  if (!s) continue
  src[s[1]] = s[2].trim().split('\n').map((l) => l.trim())
  if (s[1] !== '§0') region.rows.push(s[1])
}
if ([P.head.year, P.head.event, P.head.region].join('|') !== src['§0'].join('|')) fail('§0 — שורת הכותרות אינה זהה למקור')
const rowIds = Object.keys(src).filter((k) => k !== '§0')
for (const id of rowIds) {
  const r = P.rows[id]
  if (!r) { fail(`${id} חסר ב-passages`); continue }
  if (r.year !== src[id][0] || r.text !== src[id][1]) fail(`${id}: "${r.year} ${r.text}" מול "${src[id].join(' ')}"`)
}
for (const id of Object.keys(P.rows)) if (!src[id]) fail(`${id} ב-passages ואינו במקור`)
if (JSON.stringify(P.regions.map((g) => [g.text, g.rows])) !== JSON.stringify(srcRegions.map((g) => [g.text, g.rows])))
  fail('תאי הגאוגרפיה ב-passages אינם זהים למקור')
if (!bad) ok(`נאמנות — כותרת, §0, ${rowIds.length} שורות ו-${srcRegions.length} תאים זהים ל-SOURCE-TEXT`)

/* ---------- 2 · כיסוי ופעם אחת ---------- */
const placed = L.sections.flatMap((s) => s.rows)
const seen = new Map()
for (const r of placed) seen.set(r, (seen.get(r) ?? 0) + 1)
const twice = [...seen].filter(([, n]) => n > 1).map(([r]) => r)
const missing = rowIds.filter((r) => !seen.has(r))
const foreign = placed.filter((r) => !P.rows[r])
if (twice.length) fail('שורות שמודפסות פעמיים: ' + twice.join(' '))
if (missing.length) fail('שורות שלא הודפסו: ' + missing.join(' '))
if (foreign.length) fail('מזהים שאינם שורות: ' + foreign.join(' '))
if (placed.join() !== rowIds.join()) fail('המקטעים אינם עוברים על השורות בסדר המקור')
const sectionOf = new Map(L.sections.flatMap((s) => s.rows.map((r) => [r, s.id])))
for (const g of P.regions) {
  const homes = new Set(g.rows.map((r) => sectionOf.get(r)))
  if (homes.size !== 1) fail(`התא "${g.text}" נחצה בין מקטעים: ${[...homes].join(' · ')}`)
}
if (!twice.length && !missing.length && !foreign.length) ok(`כיסוי — ${placed.length}/${rowIds.length} שורות, כל אחת פעם אחת, בסדר המקור; כל תא בתוך מקטע אחד`)

/* ---------- 3 · מה שעורכי ---------- */
const nums = (y) => y.split('-').map(Number)
for (const s of L.sections) {
  const years = s.rows.flatMap((r) => nums(P.rows[r].year))
  const want = `${nums(P.rows[s.rows[0]].year)[0]}–${Math.max(...years)}`
  if (s.title !== want) fail(`כותרת המקטע ${s.id}: "${s.title}", נגזר "${want}"`)
}
const [from, to] = P.range.match(/\d+/g).map(Number)
if (L.axis.from !== from || L.axis.to !== to) fail(`קצות הציר ${L.axis.from}–${L.axis.to} מול הטווח ${from}–${to}`)
ok(`${L.sections.length} כותרות מקטע וקצות הציר נגזרים מהשורות ומהכותרת`)

const flat = (o) => typeof o === 'string' ? o : Array.isArray(o) ? o.map(flat).join(' ') : o && typeof o === 'object' ? Object.values(o).map(flat).join(' ') : ''
const chText = {}
let links = 0
for (const [ref, { ch, proof }] of Object.entries(L.links)) {
  if (!P.rows[ref]) { fail(`קישור לשורה שאינה קיימת: ${ref}`); continue }
  chText[ch] ??= flat(JSON.parse(await readFile(new URL(`src/lib/chapter${ch}/passages.json`, web), 'utf8')))
  if (!chText[ch].includes(proof)) fail(`${ref} → פרק ${ch}: "${proof}" אינו בפרק`)
  try { await access(new URL(`src/app/(chapter${ch})/chapter${ch}/page.tsx`, web)) } catch { fail(`${ref} → פרק ${ch}: אין נתיב /chapter${ch}`) }
  links++
}
ok(`${links} קישורים לפרקים — כל אחד נשען על משפט שנמצא באותו פרק`)

for (const [ref, p] of Object.entries(L.places)) {
  if (!P.rows[ref]?.text.includes(p.cut)) fail(`${ref}: המקום "${p.cut}" אינו חיתוך מ"${P.rows[ref]?.text}"`)
}
ok(`${Object.keys(L.places).length} שמות מקום — כל אחד חיתוך מהאירוע שלו`)

for (const g of P.regions) {
  const st = L.regions[g.id]
  if (!st) { fail(`לתא "${g.text}" אין מצב על המפה`); continue }
  for (const sh of st.shapes) if (!L.shapes[sh]) fail(`המצב ${g.id} מזכיר צורה חסרה: ${sh}`)
}
ok(`${P.regions.length} מצבי מפה, אחד לכל תא`)

console.log(bad ? `\n✗ ${bad} כשלים` : '\n✓ השער עבר')
process.exit(bad ? 1 : 0)
