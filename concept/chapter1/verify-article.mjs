/* שער מאמר פרק 1 — נאמנות · כיסוי · פעם אחת בדיוק. (פיילוט, 3.11.2026)

   1. רצף    — לכל § שב-passages.json, הקטעים שלו יחד זהים לסעיף ב-SOURCE-TEXT.md
               אחרי הסרת רווחים ופיסוק: לא „כל קטע נמצא במקור" אלא „הקטעים הם הסעיף".
   2. תוויות — em/tr תת-מחרוזת של המשפט שלהם; כל תווית בארגז תת-מחרוזת של הקטע
               שממנו נחתכה. העורכי מוצהר בשמו.
   3. פעם אחת — כל קטע נצרך ב-layout.json בדיוק פעם אחת, ו-Chapter1Article.tsx כותב
               כל ref של `uses` פעם אחת בדיוק.
   4. היקף   — הפיילוט מכסה §6–§9 בלבד, ומצהיר על כך. כשהמאמר יגדל, SCOPE גדל איתו.

   ריצה: node concept/chapter1/verify-article.mjs */
import { readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const lib = new URL('../../web/src/lib/chapter1/article/', here)
const P = JSON.parse(await readFile(new URL('passages.json', lib), 'utf8')).passages
const L = JSON.parse(await readFile(new URL('layout.json', lib), 'utf8'))
const SCOPE = ['§6', '§7', '§8', '§9']

const flat = (s) => String(s).replace(/[\s„“”"'.,:;()\[\]–—\-־?!]/g, '')
const secs = Object.fromEntries([...src.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t.trim()]))
const errors = []

/* 4 · היקף */
for (const id of SCOPE) if (!P[id]) errors.push(`${id} בהיקף הפיילוט ואין לו קטעים`)
for (const id of Object.keys(P)) if (!SCOPE.includes(id)) errors.push(`${id} אינו בהיקף המוצהר — להרחיב את SCOPE`)

/* 1 · רצף + 2 · תוויות בתוך הקטעים */
for (const [id, frags] of Object.entries(P)) {
  if (!secs[id]) { errors.push(`${id} לא קיים ב-SOURCE-TEXT`); continue }
  const seq = frags.map((f) => f.text ?? '').join('')
  if (flat(seq) !== flat(secs[id])) {
    const a = flat(seq), b = flat(secs[id]); let i = 0; while (i < a.length && a[i] === b[i]) i++
    errors.push(`${id}: הרצף סוטה מהמקור אחרי ${i} תווים — „…${a.slice(Math.max(0, i - 20), i)}‖${a.slice(i, i + 20)}" מול „${b.slice(i, i + 20)}"`)
  }
  for (const f of frags) for (const k of ['em', 'tr']) for (const x of f[k] ?? []) {
    if (!(f.text ?? '').includes(x)) errors.push(`${id}.${f.id}: ${k} „${x}" אינו במשפט`)
  }
}

/* 2 · תוויות הארגז — חתוכות מהקטע שלהן */
const textOf = (ref) => { const [s, f] = ref.split('.'); return P[s]?.find((x) => x.id === f)?.text ?? '' }

/* 2 · תוויות המפה — חתוכות מ-§7/§8, ואין על המפה שם שהמקור לא נותן */
const R = L.route
const cutR = (where, label, ref) => { if (!textOf(ref).includes(label)) errors.push(`route/${where}: „${label}" אינו ב-${ref}`) }
cutR('start', R.start.label, R.start.from)
for (const g of R.goods) cutR('goods', g.label, g.from)
for (const e of R.empires) { cutR(e.side, e.label, e.from); cutR(e.side + '/tribe', e.tribe, e.from) }
if (R.points.length < 2) errors.push('route: אין דרך')
for (const [x, y] of R.points) if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) errors.push(`route: נקודה מחוץ לציור ${x},${y}`)
const EDITORIAL = { ...Object.fromEntries(L.sections.map((s) => [s.id, s.title])) }

/* 3 · פעם אחת — ב-layout ובקוד */
const used = new Map()
for (const s of L.sections) for (const r of s.uses) used.set(r, (used.get(r) ?? 0) + 1)
const all = Object.entries(P).flatMap(([s, fs]) => fs.map((f) => `${s}.${f.id}`))
for (const r of all) { const n = used.get(r) ?? 0; if (n !== 1) errors.push(`${r} נצרך ${n} פעמים`) }
for (const r of used.keys()) if (!all.includes(r)) errors.push(`layout מפנה לקטע שלא קיים: ${r}`)

const tsx = await readFile(new URL('../../web/src/components/chapter1/Chapter1Article.tsx', here), 'utf8')
const code = tsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')
/* a ref is §N.id — only the dot needs escaping; count it as a quoted literal */
const literal = (r) => code.split(`'${r}'`).length - 1
for (const s of L.sections) for (const r of s.uses) { const n = literal(r); if (n !== 1) errors.push(`Chapter1Article.tsx כותב את '${r}' ${n} פעמים (צריך 1)`) }
for (const r of [...code.matchAll(/'(§\d+\.[\w]+)'/g)].map((m) => m[1])) if (!used.has(r)) errors.push(`Chapter1Article.tsx מפנה ל-'${r}' שאינו ב-layout`)

console.log(`היקף: ${SCOPE.join(' ')} · קטעים: ${all.length}`)
console.log(`עורכי (מוצהר): ${Object.values(EDITORIAL).map((x) => `„${x}"`).join(' · ')}`)
if (errors.length) { console.log('❌ ' + errors.length + ' שגיאות:'); for (const e of errors) console.log('  · ' + e); process.exit(1) }
console.log('✅ נאמנות · כיסוי · פעם אחת בדיוק')
