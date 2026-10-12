/* שער התרגול של פרק 8 — כל תשובה וכל מסיח נשענים על המקור (שער פרק 7, בלי המאגר).

   לכל שאלה: הסעיפים שב-`sources` קיימים; כל ביטוי שהלומדת בוחרת ממנו — אפשרות, צד של
   התאמה, שלב בסדר — אחרי הסרת פיסוק וניקוד, מופיע במקור, או מוצהר ב-PARAPHRASE עם המקום
   שהוא נשען עליו. לכל שאלת בחירה יש תשובה נכונה, ו-photo מפנה לנכס שהפרק עצמו מציג.
   ריצה: node concept/chapter8/verify-practice.mjs */
import { readFile, access } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const Q = JSON.parse(await readFile(new URL('../../web/src/lib/chapter8/practice.json', here), 'utf8')).questions
const body = src.slice(0, src.indexOf('## מפת הפרק'))
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳.,:;()\[\]–—\-?!]/g, '')
const F = flat(body)

const PARAPHRASE = {
  'תרגום הקוראן לשפות זרות': 'מסיח; §5 „התירו לתרגם את הקוראן לשפות זרות" — ו„בשום אופן לא תרגום"',
  'הפלא של הקוראן': 'מסיח; §5 „הפלא שלו (אעג\'אז אלקוראן)"',
  'שרשרת המסירה שלהם טובה': 'מסיח; §7 — זו הגדרת צחיח („שרשרת המסירה שלו טובה"), ובצ\'עיף „נפלו פגמים בשרשרת המסירה"',
  'הם נמצאים בצחיחאן': 'מסיח; §8 — הצחיחאן הם הקבצים המהימנים ביותר',
  'מוחמד ציווה לשמור עליהם': 'מסיח מוצהר — אין במקור ציווי כזה',
  'הטיף בדרכי נועם': 'מסיח; §3 — על התקופה במכה „הטיף בדרכי נועם"',
}
const PF = new Set(Object.keys(PARAPHRASE).map(flat))
const errors = []
const secs = new Set([...src.matchAll(/^### (§\d+)/gm)].map((m) => m[1]))
const seen = new Set()
for (const q of Q) {
  if (seen.has(q.id)) errors.push(`id כפול ${q.id}`); seen.add(q.id)
  for (const s of q.sources.split(/\s+/)) if (!secs.has(s)) errors.push(`${q.id}: ${s} אינו במקור`)
  const phrases = [...(q.options ?? []).map((o) => o.text), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]), ...(q.steps ?? [])]
  for (const ph of phrases) if (!F.includes(flat(ph)) && !PF.has(flat(ph))) errors.push(`${q.id}: „${ph}" אינו במקור ואינו מוצהר כניסוח`)
  if (q.options && !q.options.some((o) => o.right)) errors.push(`${q.id}: אין תשובה נכונה`)
  if (q.photo) { try { await access(new URL('../../web/public/assets/chapter8/' + q.photo, here)) } catch { errors.push(`${q.id}: אין נכס ${q.photo}`) } }
}
const used = Object.keys(PARAPHRASE).filter((k) => Q.some((q) => [...(q.options ?? []).map((o) => o.text), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]), ...(q.steps ?? [])].some((ph) => flat(ph) === flat(k))))
if (used.length !== Object.keys(PARAPHRASE).length) errors.push('ניסוח מוצהר שאף שאלה לא משתמשת בו')
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
console.log(`✅ ${Q.length} שאלות · כל ביטוי מהמקור או מוצהר (${used.length} ניסוחים מוצהרים, כולם מסיחים)`)
