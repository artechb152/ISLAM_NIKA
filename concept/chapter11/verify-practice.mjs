/* שער התרגול של פרק 11 — כל תשובה וכל מסיח נשענים על המקור (השער של פרק 13).

   לכל שאלה: הסעיפים שב-`sources` קיימים; כל ביטוי שהלומדת בוחרת או מסדרת — אפשרות, צד של
   התאמה, צעד בשאלת סדר — אחרי הסרת פיסוק וניקוד, מופיע בגוף המקור (בין כותרת הפרק להערות
   העריכה), או מוצהר ב-PARAPHRASE עם הסיבה. לשאלת single יש בדיוק תשובה נכונה אחת, לשאלת
   multi לפחות אחת. ואף שאלה לא נוגעת בחמש מטרות-העל (הערת עריכה 3, כלל 25).
   ריצה: node concept/chapter11/verify-practice.mjs */
import { readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const Q = JSON.parse(await readFile(new URL('../../web/src/lib/chapter11/practice.json', here), 'utf8')).questions
const body = src.slice(src.indexOf('## פרק אחד עשר'), src.indexOf('## הערות עריכה'))
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳״*.,:;()\[\]–—\-?!]/g, '')
const F = flat(body)

const PARAPHRASE = {
  'לפי מספר המאמינים בכל מדינה': 'מסיח מוצהר — אינו במקור',
}
const PF = new Set(Object.keys(PARAPHRASE).map(flat))
const phrasesOf = (q) => [
  ...(q.options ?? []).map((o) => o.text),
  ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]),
  ...(q.steps ?? []),
]
const errors = []
if (!body.length || F.length < 1000) errors.push('גוף המקור לא נמצא ב-SOURCE-TEXT.md')
const secs = new Set([...src.matchAll(/^### (§\d+)/gm)].map((m) => m[1]))
const seen = new Set()
for (const q of Q) {
  if (seen.has(q.id)) errors.push(`id כפול ${q.id}`); seen.add(q.id)
  for (const s of q.sources.split(/\s+/)) if (!secs.has(s)) errors.push(`${q.id}: ${s} אינו במקור`)
  for (const ph of phrasesOf(q)) if (!F.includes(flat(ph)) && !PF.has(flat(ph))) errors.push(`${q.id}: „${ph}" אינו במקור ואינו מוצהר כניסוח`)
  if (q.options && !q.options.some((o) => o.right)) errors.push(`${q.id}: אין תשובה נכונה`)
  if (q.type === 'single' && q.options.filter((o) => o.right).length !== 1) errors.push(`${q.id}: single בלי בדיוק תשובה נכונה אחת`)
  if (q.type === 'match' && new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) errors.push(`${q.id}: שתי שורות עם אותה תשובה`)
  if (q.type === 'order' && new Set(q.steps).size !== q.steps.length) errors.push(`${q.id}: צעד כפול`)
  if (/חמש|חמישה/.test(JSON.stringify(q))) errors.push(`${q.id}: נוגע בחמש מטרות-העל`)
}
const used = Object.keys(PARAPHRASE).filter((k) => Q.some((q) => phrasesOf(q).some((ph) => flat(ph) === flat(k))))
if (used.length !== Object.keys(PARAPHRASE).length) errors.push('ניסוח מוצהר שאף שאלה לא משתמשת בו')
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
const covered = [...new Set(Q.flatMap((q) => q.sources.split(/\s+/)))].sort()
console.log(`✅ ${Q.length} שאלות · ${covered.join(' ')} · כל ביטוי מגוף המקור או מוצהר (${used.length} מסיח מוצהר)`)
