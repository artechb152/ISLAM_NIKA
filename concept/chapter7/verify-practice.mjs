/* שער התרגול של פרק 7 — כל תשובה וכל מסיח נשענים על המקור.

   לכל שאלה: הסעיפים שב-`sources` קיימים, וכל ביטוי שהלומדת בוחרת ממנו (אפשרות,
   צד שמאל/ימין של התאמה, שלב בשרשרת) — אחרי הסרת פיסוק, ניקוד וגרשיים — מופיע
   במקור. ביטוי שאינו מופיע כלשונו חייב להופיע ברשימת PARAPHRASE למטה, עם המקום
   שבמקור שהוא מקצר, כדי שכל ניסוח שלי יהיה מוצהר ולא שקט.

   ריצה: node concept/chapter7/verify-practice.mjs */
import { readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const PQ = JSON.parse(await readFile(new URL('../../web/src/lib/chapter7/practice.json', here), 'utf8')).questions
/* מאגר חדר המבחנים — אותם כללים, וגם כאן כל ביטוי נבדק. התשובות הן משפטים שלמים
   יותר, ולכן הבדיקה שם היא על המפתח: אות/ספרה שאינה בסעיף המוצהר מפילה. */
const BANK = JSON.parse(await readFile(new URL('../../web/src/lib/exams/banks/ch7.json', here), 'utf8'))
const Q = PQ
const body = src.slice(0, src.indexOf('## מפת הפרק'))
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳.,:;()\[\]–—\-?!]/g, '')
const F = flat(body)

/* ניסוחים שמקצרים את המקור ואינם תת-מחרוזת שלו — כל אחד עם המשפט שהוא נשען עליו */
const PARAPHRASE = {
  'ימים בשנה ירחית': '§0 „שנה ירחית שאורכה 354 ימים"',
  'ימים בשנת שמש': '§0 „שנת שמש ... אורכה 365 ימים"',
  'ימי הפער מידי שנה': '§0 „מידי שנה נוצר "פער" של 11 ימים"',
  'שנים עד שלוח השנה הירחי משלים סיבוב שלם': '§4 „מידי 33 שנים לוח השנה הירחי משלים סיבוב שלם"',
  'כדי להוסיף חודש קדוש': 'מסיח; §2 — החודש הקדוש „לא מקבל שום קדושה"',
  'על הוספת חודש ירחי נוסף מידי כמה שנים': 'מסיח; §0 „הוספת חודש ירחי נוסף מידי כמה שנים"',
  'על ספירת השנים מתחילת ההגרה': 'מסיח; §7 „החל לספור את השנים שלו מתחילת ההג\'רה"',
  'על הוספת יום ה30 לחודש': 'מסיח; §5 „להוסיף את יום ה- 30"',
  'בחצי האי ערב נהגו לעבר את השנה ולהוסיף חודש': '§2 „השבטים בחצי האי ערב היו נוהגים גם לעבר את השנה ולהוסיף חודש"',
  'מוחמד ציווה על הפסקת עיבור השנים באסלאם': '§3 „ציווה מוחמד בין היתר על הפסקת עיבור השנים באסלאם"',
  'חודש רמדאן מתחיל מידי שנה אחד עשר ימים מוקדם יותר': '§4 „ומידי שנה מתחילים אחד עשר ימים מוקדם יותר"',
  'בין שנה ירחית לשנת שמש נוצר פער של 11 ימים': '§0',
  'מוסיפים את יום ה30 לחודש שלפניו והחודש מתחיל ביום למחרת': '§5',
  'מוסיפים חודש ירחי נוסף לשנה': 'מסיח; §0',
  'החודש מתחיל בכל זאת לפי חישוב אסטרונומי': 'מסיח; §6 האסכולה המצרית',
  'דוחים את רמדאן בשבוע': 'מסיח — אין במקור דחייה של שבוע; „דחיה של יום" (§6)',
  'ראיית הירח בפועל ללא חישובים אסטרונומיים': '§6',
  'הספירה מתחילה ממות מוחמד': 'מסיח; §7 — מות מוחמד בין האירועים שנדחו',
  'את זה קבע החליף השני עמר בן אלחטאב': '§7 „וזאת קבע הח\'ליף השני עמר בן אלח\'טאב"',
  'ההחלטה דחתה אירועים כמו לידת מוחמד וההתגלות הראשונה': '§7',
  'את זה ציווה מוחמד בדרשת הפרידה': 'מסיח; §3',
  'כדי שעובדי האלילים יוכלו לבצע את הריטואלים במכה': 'מסיח; §1 — הסיבה לקדושת ד\'ו אלחג\'ה, „כדי שעובדי האלילים יוכלו לבצע את הריטואלים הפגאניים במכה"',
  'כדי ששנת השמש והירח יחזרו להסתנכרן': 'מסיח; §0 — מטרת העיבור בלוח היהודי, „ושנת השמש והירח חוזרים שוב להסתנכרן"',
  'מועדי האסלאם אינם בהלימה ללוח השנה השמשי': '§4 „שמועדי האסלאם כדוגמת חודש רמדאן אינם בהלימה ללוח השנה השמשי"',
}
const PF = new Set(Object.keys(PARAPHRASE).map(flat))

const errors = []
const secs = new Set([...src.matchAll(/^### (§\d+)/gm)].map((m) => m[1]))
const seen = new Set()
for (const q of Q) {
  if (seen.has(q.id)) errors.push(`id כפול ${q.id}`); seen.add(q.id)
  for (const s of q.sources.split(/\s+/)) if (!secs.has(s)) errors.push(`${q.id}: ${s} אינו במקור`)
  const phrases = [
    ...(q.options ?? []).map((o) => o.text),
    ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]),
    ...(q.steps ?? []),
  ]
  for (const ph of phrases) {
    const f = flat(ph)
    if (F.includes(f) || PF.has(f)) continue
    errors.push(`${q.id}: „${ph}" אינו במקור ואינו מוצהר כניסוח`)
  }
  if (q.options && !q.options.some((o) => o.right)) errors.push(`${q.id}: אין תשובה נכונה`)
}
/* המאגר: מקורות קיימים, מזהים ייחודיים, ובכל תשובה נכונה המספרים שבה מופיעים בסעיפים
   שהשאלה מצהירה עליהם — כך מספר שהמצאתי (שנה, ספירה) לא עובר */
const secText = Object.fromEntries([...src.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t]))
const bids = new Set()
for (const q of BANK.questions) {
  if (bids.has(q.id)) errors.push(`מאגר: id כפול ${q.id}`); bids.add(q.id)
  const ss = q.sources.split(/\s+/)
  for (const s of ss) if (!secs.has(s)) errors.push(`מאגר ${q.id}: ${s} אינו במקור`)
  const ctx = ss.map((s) => secText[s] ?? '').join(' ')
  const answers = [...(q.options ?? []).filter((o) => o.right).map((o) => o.text), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right]), ...(q.points ?? []), q.model ?? '']
  for (const a of answers) for (const n of a.match(/\d+/g) ?? []) if (!ctx.includes(n) && !(q.sources.includes('§8') && Number(n) <= 12) && !(n === '37' && ctx.includes('36-7')))
    errors.push(`מאגר ${q.id}: המספר ${n} אינו בסעיפים ${q.sources}`)
  for (const o of q.options ?? []) for (const n of o.text.match(/\d+/g) ?? []) if (/[+=]/.test(o.text)) errors.push(`מאגר ${q.id}: חשבון באפשרות „${o.text}"`)
  if (q.options && !q.options.some((o) => o.right)) errors.push(`מאגר ${q.id}: אין תשובה נכונה`)
}
console.log(`· מאגר חדר המבחנים: ${BANK.questions.length} שאלות נבדקו`)
console.log(`· ${Object.keys(PARAPHRASE).length} ניסוחים מוצהרים (קיצור של משפט מקור, או מסיח)`)
if (errors.length) { console.log('❌ ' + errors.length + ' כשלים:\n  ' + errors.join('\n  ')); process.exit(1) }
console.log(`✅ ${Q.length} שאלות · כל ביטוי במקור או מוצהר`)
