/* שער התרגול של פרק 13 — כל תשובה וכל מסיח נשענים על המקור (השער של פרק 8).

   לכל שאלה: הסעיפים שב-`sources` קיימים; כל ביטוי שהלומדת בוחרת ממנו — אפשרות, צד של
   התאמה — אחרי הסרת פיסוק והדגשה, מופיע בכרטיסי המקור, או מוצהר ב-PARAPHRASE עם הסיבה.
   „בכרטיסי המקור" = בין כותרת הפרק להערות העריכה, **בלי תיאורי התמונה** שבסוגריים
   מרובעים — הם תיאור שלי, לא המקור. לכל שאלת בחירה יש תשובה נכונה, וכל photo הוא
   החיתוך מהחוברת שהאולם עצמו מציג.
   ריצה: node concept/chapter13/verify-practice.mjs */
import { readFile, access } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const Q = JSON.parse(await readFile(new URL('../../web/src/lib/chapter13/practice.json', here), 'utf8')).questions
const body = src.slice(src.indexOf('## פרק שלושה-עשר'), src.indexOf('## הערות עריכה')).replace(/\[[^\]]*\]/g, '')
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳*.,:;()\[\]–—\-?!]/g, '')
const F = flat(body)

const PARAPHRASE = {
  'דגל א׳': 'תווית לתמונה — הלומדת מזהה את הדגל מהחיתוך',
  'דגל ב׳': 'תווית לתמונה',
  'דגל ג׳': 'תווית לתמונה',
  'דגל ד׳': 'תווית לתמונה',
  'את החרב': 'מסיח; §1 — החרב היא של סעודיה',
  'את שלושת הכוכבים': 'מסיח; §4 — הכוכבים הם של סוריה',
  'את כיפת הסלע': 'מסיח; §6–§7 — כיפת הסלע היא בסמלי חמאס',
  'שלוש ערי הקודש של האסלאם': 'מסיח מוצהר — אינו במקור',
  'שלוש המדינות שהתאחדו עם סוריה': 'מסיח מוצהר — אינו במקור',
  'שלושת הצבעים של הלאומיות הכלל-ערבית': 'מסיח; §3–§4 — הצבעים הם מוטיב נפרד בכרטיס',
}
const PF = new Set(Object.keys(PARAPHRASE).map(flat))
const phrasesOf = (q) => [...(q.options ?? []).map((o) => o.text), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right])]
const errors = []
const secs = new Set([...src.matchAll(/^### (§\d+)/gm)].map((m) => m[1]))
const seen = new Set()
const asset = async (id, f) => {
  try { await access(new URL('../../web/public/assets/chapter13/flags/' + f, here)) } catch { errors.push(`${id}: אין נכס ${f}`) }
}
for (const q of Q) {
  if (seen.has(q.id)) errors.push(`id כפול ${q.id}`); seen.add(q.id)
  for (const s of q.sources.split(/\s+/)) if (!secs.has(s)) errors.push(`${q.id}: ${s} אינו במקור`)
  for (const ph of phrasesOf(q)) if (!F.includes(flat(ph)) && !PF.has(flat(ph))) errors.push(`${q.id}: „${ph}" אינו במקור ואינו מוצהר כניסוח`)
  if (q.options && !q.options.some((o) => o.right)) errors.push(`${q.id}: אין תשובה נכונה`)
  if (q.type === 'single' && q.options.filter((o) => o.right).length !== 1) errors.push(`${q.id}: single עם יותר מתשובה נכונה אחת`)
  if (q.photo) await asset(q.id, q.photo)
  for (const p of q.pairs ?? []) if (p.photo) await asset(q.id, p.photo)
  /* §15 has no motifs; a question about it would supply them (DECISIONS, הערת עריכה 9) */
  if (q.sources.split(/\s+/).includes('§15')) errors.push(`${q.id}: שאלה על §15`)
}
const used = Object.keys(PARAPHRASE).filter((k) => Q.some((q) => phrasesOf(q).some((ph) => flat(ph) === flat(k))))
if (used.length !== Object.keys(PARAPHRASE).length) errors.push('ניסוח מוצהר שאף שאלה לא משתמשת בו')
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
console.log(`✅ ${Q.length} שאלות · כל ביטוי מכרטיסי המקור או מוצהר (${used.length} מוצהרים: 4 תוויות תמונה, השאר מסיחים)`)
