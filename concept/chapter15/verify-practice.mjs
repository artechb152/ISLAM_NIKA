/* שער התרגול של פרק 15 — כל תשובה וכל מסיח נשענים על הטבלה (השער של פרקים 11/13).

   הפרק הוא טבלה, ולכן השער בודק יותר מ„הביטוי מופיע במקור": הוא קורא את הטבלה עצמה
   (§N → שנה · אירוע · תא גאוגרפיה) ובודק כל טענה מולה.
   - לכל שאלה: הסעיפים שב-`sources` קיימים; כל ביטוי שהלומדת בוחרת או מסדרת — אפשרות, צד של
     התאמה, צעד — אחרי הסרת פיסוק וניקוד, מופיע בגוף המקור, או מוצהר ב-PARAPHRASE עם הסיבה.
   - single: בדיוק תשובה נכונה אחת; multi: לפחות אחת; match: אין שתי שורות עם אותה תשובה.
   - order: כל צעד הוא אירוע של שורה כלשונו, והסדר הנכון הוא סדר השנים בטבלה.
   - match שנה↔אירוע: השנה היא השנה של אותה שורה. match אירוע↔תא: השורה יושבת באותו תא.
   - single ששואל על שנה: התשובה היא השנה של האירוע שבשאלה. single ששמה שנה בשאלה: התשובה
     חתוכה מהאירוע של אותה שנה.
   - multi על תא („…"): התשובות הנכונות הן בדיוק השורות של התא.
   - ⚠ הערות עריכה 1–2: אין תשובה נכונה (ואין צעד בשאלת סדר) שהיא אחת מ-§17 §18 §23 או
     שנושאת 656/657/758 — השנים האלה שגויות במקור או סותרות את פרק 9.
   - כלל 25: „ח'ליף" ו„ארבעה" אינם בטבלה ואינם עולים בשום שדה של שאלה.
   - כיסוי: לכל מקטע של layout.json יש שאלה שנשענת על שורה שלו.
   ריצה: node concept/chapter15/verify-practice.mjs */
import { readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const Q = JSON.parse(await readFile(new URL('../../web/src/lib/chapter15/practice.json', here), 'utf8')).questions
const layout = JSON.parse(await readFile(new URL('../../web/src/lib/chapter15/layout.json', here), 'utf8'))
const body = src.slice(src.indexOf('## פרק חמישה עשר'), src.indexOf('## הערות עריכה'))
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳״*.,:;()\[\]–—\-?!]/g, '')
const F = flat(body)

/* הטבלה: כל ## הוא תא גאוגרפיה, כל ### §N שורה — שנה ואז אירוע */
const rows = {}
let cell = null
for (const block of body.split(/\n(?=##)/)) {
  const h2 = block.match(/^## (.+)$/m)
  if (h2 && !block.startsWith('###')) cell = h2[1].trim()
  const m = block.match(/^### (§\d+)\n([^\n]+)\n([^\n]+)/)
  if (m && m[1] !== '§0') rows[m[1]] = { year: m[2].trim(), event: m[3].trim(), cell }
}
const R = Object.entries(rows)
const byEvent = (t) => R.find(([, r]) => flat(r.event) === flat(t))
const byYear = (y) => R.filter(([, r]) => r.year === y)
const cells = new Set(R.map(([, r]) => r.cell))

const PARAPHRASE = {}
const PF = new Set(Object.keys(PARAPHRASE).map(flat))
const phrasesOf = (q) => [
  ...(q.options ?? []).map((o) => o.text),
  ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]),
  ...(q.steps ?? []),
]
const rightsOf = (q) => [
  ...(q.options ?? []).filter((o) => o.right).map((o) => o.text),
  ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]),
  ...(q.steps ?? []),
]
const DISPUTED = ['§17', '§18', '§23']

const errors = []
if (R.length !== 23) errors.push(`הטבלה נקראה עם ${R.length} שורות, לא 23`)
if (cells.size !== 6) errors.push(`הטבלה נקראה עם ${cells.size} תאי גאוגרפיה, לא 6`)
const secs = new Set([...src.matchAll(/^### (§\d+)/gm)].map((m) => m[1]))
const seen = new Set()
for (const q of Q) {
  if (seen.has(q.id)) errors.push(`id כפול ${q.id}`); seen.add(q.id)
  for (const s of q.sources.split(/\s+/)) if (!secs.has(s)) errors.push(`${q.id}: ${s} אינו במקור`)
  for (const ph of phrasesOf(q)) if (!F.includes(flat(ph)) && !PF.has(flat(ph))) errors.push(`${q.id}: „${ph}" אינו במקור ואינו מוצהר כניסוח`)
  if (q.options && !q.options.some((o) => o.right)) errors.push(`${q.id}: אין תשובה נכונה`)
  if (q.type === 'single' && q.options.filter((o) => o.right).length !== 1) errors.push(`${q.id}: single בלי בדיוק תשובה נכונה אחת`)
  if (q.type === 'match' && new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) errors.push(`${q.id}: שתי שורות עם אותה תשובה`)

  /* order — אירועים כלשונם, בסדר השנים */
  if (q.type === 'order') {
    if (new Set(q.steps).size !== q.steps.length) errors.push(`${q.id}: צעד כפול`)
    const hits = q.steps.map((s) => byEvent(s))
    hits.forEach((h, i) => { if (!h) errors.push(`${q.id}: הצעד „${q.steps[i]}" אינו אירוע של שורה`) })
    const ys = hits.filter(Boolean).map(([, r]) => parseInt(r.year, 10))
    for (let i = 1; i < ys.length; i++) if (!(ys[i] > ys[i - 1])) errors.push(`${q.id}: הצעדים ${i}–${i + 1} אינם בסדר שנים עולה (${ys[i - 1]}, ${ys[i]})`)
  }

  /* match — שנה↔אירוע, או אירוע↔תא */
  if (q.type === 'match') for (const p of q.pairs) {
    if (/^\d+$/.test(p.left)) {
      if (!byYear(p.left).some(([, r]) => flat(r.event) === flat(p.right))) errors.push(`${q.id}: „${p.right}" אינו האירוע של ${p.left}`)
    } else if (cells.has(p.right)) {
      const h = byEvent(p.left)
      if (!h) errors.push(`${q.id}: „${p.left}" אינו אירוע של שורה`)
      else if (h[1].cell !== p.right) errors.push(`${q.id}: „${p.left}" יושב בתא „${h[1].cell}", לא „${p.right}"`)
    } else errors.push(`${q.id}: זוג שהשער אינו יודע לבדוק מול הטבלה (${p.left} / ${p.right})`)
  }

  /* single — שנה של אירוע, או חלק מאירוע של שנה */
  if (q.type === 'single') {
    const right = q.options.find((o) => o.right)?.text ?? ''
    if (q.options.every((o) => /^\d+$/.test(o.text))) {
      const h = R.find(([, r]) => flat(q.prompt).includes(flat(r.event)))
      if (!h) errors.push(`${q.id}: שאלת שנה בלי אירוע של שורה בשאלה`)
      else if (h[1].year !== right) errors.push(`${q.id}: ${right} אינה השנה של „${h[1].event}" (${h[1].year})`)
      for (const o of q.options) if (!byYear(o.text).length) errors.push(`${q.id}: ${o.text} אינה שנה בטבלה`)
    } else {
      const y = (q.prompt.match(/\b\d{3}\b/) ?? [])[0]
      if (y) {
        const rs = byYear(y)
        if (!rs.some(([, r]) => flat(r.event).includes(flat(right)))) errors.push(`${q.id}: „${right}" אינו באירוע של ${y}`)
        for (const o of q.options) if (!o.right && rs.some(([, r]) => flat(r.event).includes(flat(o.text)))) errors.push(`${q.id}: המסיח „${o.text}" נכון גם הוא`)
      }
    }
  }

  /* multi על תא — התשובות הנכונות הן בדיוק שורות התא */
  if (q.type === 'multi') {
    const named = [...cells].find((c) => q.prompt.includes(`„${c}"`))
    if (!named) errors.push(`${q.id}: multi שאינו נוקב בתא`)
    else {
      const want = new Set(R.filter(([, r]) => r.cell === named).map(([, r]) => flat(r.event)))
      for (const o of q.options) {
        const h = byEvent(o.text)
        if (!h) { errors.push(`${q.id}: „${o.text}" אינו אירוע של שורה`); continue }
        if (o.right !== want.has(flat(o.text))) errors.push(`${q.id}: „${o.text}" מסומן ${o.right ? 'נכון' : 'שגוי'} אבל יושב בתא „${h[1].cell}"`)
      }
      const got = new Set(q.options.filter((o) => o.right).map((o) => flat(o.text)))
      if (got.size !== want.size) errors.push(`${q.id}: בתא „${named}" ${want.size} שורות, מסומנות ${got.size}`)
    }
  }

  /* ⚠ הערות עריכה 1–2 */
  for (const r of rightsOf(q)) {
    if (/656|657|758/.test(r)) errors.push(`${q.id}: תשובה נכונה עם שנה שנויה במחלוקת („${r}")`)
    const h = byEvent(r)
    if (h && DISPUTED.includes(h[0])) errors.push(`${q.id}: ${h[0]} כתשובה נכונה או כצעד`)
  }
  const { $note, ...fields } = q
  if (/ח'ליף|ח׳ליף|ארבעה|ארבעת/.test(JSON.stringify(fields))) errors.push(`${q.id}: „ח'ליף"/„ארבעה" — אינם בטבלה`)
}

/* כיסוי — כל מקטע */
for (const s of layout.sections) {
  if (!Q.some((q) => q.sources.split(/\s+/).some((x) => s.rows.includes(x)))) errors.push(`מקטע ${s.title} בלי שאלה`)
}
const used = Object.keys(PARAPHRASE).filter((k) => Q.some((q) => phrasesOf(q).some((ph) => flat(ph) === flat(k))))
if (used.length !== Object.keys(PARAPHRASE).length) errors.push('ניסוח מוצהר שאף שאלה לא משתמשת בו')
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
const covered = new Set(Q.flatMap((q) => q.sources.split(/\s+/)))
const rowsCovered = R.filter(([id]) => covered.has(id)).length
console.log(`✅ ${Q.length} שאלות · ${rowsCovered}/23 שורות · 3/3 מקטעים · כל ביטוי הוא תא של הטבלה (${used.length} מוצהרים) · אין תשובה על §17 §18 §23`)
