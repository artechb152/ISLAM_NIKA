/* שער התרגול של פרק 1 (המאמר) — כל תשובה וכל מסיח נשענים על המקור (השער של פרקים 8 ו-13).

   לכל שאלה: הסעיפים שב-`sources` קיימים; כל ביטוי שהלומדת בוחרת ממנו — אפשרות, צד של
   התאמה, שלב בסידור — אחרי הסרת פיסוק, מופיע בטקסט המקור (בין כותרת הפרק להערות העריכה),
   או מוצהר ב-PARAPHRASE עם הסיבה. לכל שאלת בחירה יש תשובה נכונה; single — אחת בדיוק;
   order — השלבים בסדר שבו הם במקור; כל photo הוא ציור שהמאמר עצמו מציג.
   ריצה: node concept/chapter1/verify-practice.mjs */
import { access, readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const Q = JSON.parse(await readFile(new URL('../../web/src/lib/chapter1/article/practice.json', here), 'utf8')).questions
const body = src.slice(src.indexOf('## פרק ראשון'), src.indexOf('## הערות עריכה')).replace(/^#+ .*$/gm, '')
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳*.,:;()\[\]–—\-־?!]/g, '')
const F = flat(body)

const PARAPHRASE = {
  'הנביא הביא בשורה חדשה, שלא הייתה לפניו': 'מסיח; היפוכו של §39 („לא הביא בשורה חדשה, אלא החזיר עטרה ליושנה")',
  'הביזנטים השליטו את הנצרות בחצי האי': 'מסיח; היפוכו של §47 („לא הצליחו להשליט את דתם שם")',
}
const PF = new Set(Object.keys(PARAPHRASE).map(flat))
const phrasesOf = (q) => [...(q.options ?? []).map((o) => o.text), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]), ...(q.steps ?? [])]
const errors = []
const secs = new Set([...src.matchAll(/^### (§\d+)/gm)].map((m) => m[1]))
const seen = new Set()
const article = await readFile(new URL('../../web/src/components/chapter1/Chapter1Article.tsx', here), 'utf8')
for (const q of Q) {
  if (seen.has(q.id)) errors.push(`id כפול ${q.id}`); seen.add(q.id)
  for (const s of q.sources.split(/\s+/)) if (!secs.has(s)) errors.push(`${q.id}: ${s} אינו במקור`)
  for (const ph of phrasesOf(q)) if (!F.includes(flat(ph)) && !PF.has(flat(ph))) errors.push(`${q.id}: „${ph}" אינו במקור ואינו מוצהר כניסוח`)
  if (q.options && !q.options.some((o) => o.right)) errors.push(`${q.id}: אין תשובה נכונה`)
  if (q.type === 'single' && q.options.filter((o) => o.right).length !== 1) errors.push(`${q.id}: single עם יותר מתשובה נכונה אחת`)
  if (q.options && new Set(q.options.map((o) => o.text)).size !== q.options.length) errors.push(`${q.id}: אפשרות כפולה`)
  if (q.pairs && new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) errors.push(`${q.id}: תשובת התאמה כפולה`)
  if (q.type === 'order') {
    const at = q.steps.map((s) => F.indexOf(flat(s)))
    if (at.some((x, i) => i && x < at[i - 1])) errors.push(`${q.id}: השלבים אינם בסדר המקור`)
  }
  if (q.photo) {
    try { await access(new URL('../../web/public/assets/chapter1/article/' + q.photo, here)) } catch { errors.push(`${q.id}: אין נכס ${q.photo}`) }
    if (!article.includes(`img="${q.photo.replace(/\.jpg$/, '')}"`)) errors.push(`${q.id}: ${q.photo} אינו ציור שהמאמר מציג`)
  }
}
const used = Object.keys(PARAPHRASE).filter((k) => Q.some((q) => phrasesOf(q).some((ph) => flat(ph) === flat(k))))
if (used.length !== Object.keys(PARAPHRASE).length) errors.push('ניסוח מוצהר שאף שאלה לא משתמשת בו')
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
console.log(`✅ ${Q.length} שאלות · כל ביטוי מהמקור או מוצהר (${used.length} מוצהרים, שניהם מסיחים)`)
