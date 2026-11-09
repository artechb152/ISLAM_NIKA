/* שער מאמר פרק 1 — נאמנות · כיסוי · פעם אחת בדיוק. (פיילוט 3.11.2026; כל הפרק 9.11.2026)

   1. רצף    — לכל § שב-passages.json, הקטעים שלו יחד זהים לסעיף ב-SOURCE-TEXT.md
               אחרי הסרת רווחים ופיסוק: לא „כל קטע נמצא במקור" אלא „הקטעים הם הסעיף".
   2. תוויות — em/tr תת-מחרוזת של המשפט שלהם; כל תווית במפת הדרך, בכרטיסי האימפריות, בכתוביות הסרטון, בלוחות האלילים ובכרטיסי המילים
               תת-מחרוזת של הקטע שממנו נחתכה. העורכי (כותרות מקטעים ומשנה) מוצהר בשמו.
   3. פעם אחת — כל קטע נצרך ב-layout.json בדיוק פעם אחת, ו-Chapter1Article.tsx כותב
               כל ref של `uses` פעם אחת בדיוק — ולא מפנה לשום ref אחר.
   4. היקף   — לכל § של המקור (§0–§48) יש קטעים, ואין § שאינו במקור.
   5. נכסים  — כל ציור שהמאמר מפנה אליו (img="…", הסרטון והפוסטר שלו) קיים בדיסק.

   ריצה: node concept/chapter1/verify-article.mjs */
import { access, readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const lib = new URL('../../web/src/lib/chapter1/article/', here)
const P = JSON.parse(await readFile(new URL('passages.json', lib), 'utf8')).passages
const L = JSON.parse(await readFile(new URL('layout.json', lib), 'utf8'))

const flat = (s) => String(s).replace(/[\s„“”"'.,:;()\[\]–—\-־?!]/g, '')
const secs = Object.fromEntries([...src.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t.trim()]))
const errors = []

/* 4 · היקף — כל סעיף של המקור */
const SCOPE = Object.keys(secs)
for (const id of SCOPE) if (!P[id]) errors.push(`${id} במקור ואין לו קטעים`)
for (const id of Object.keys(P)) if (!SCOPE.includes(id)) errors.push(`${id} אינו במקור`)

/* 1 · רצף + 2 · תוויות בתוך הקטעים */
for (const [id, frags] of Object.entries(P)) {
  if (!secs[id]) continue
  const seq = frags.map((f) => f.text ?? '').join('')
  if (flat(seq) !== flat(secs[id])) {
    const a = flat(seq), b = flat(secs[id]); let i = 0; while (i < a.length && a[i] === b[i]) i++
    errors.push(`${id}: הרצף סוטה מהמקור אחרי ${i} תווים — „…${a.slice(Math.max(0, i - 20), i)}‖${a.slice(i, i + 20)}" מול „${b.slice(i, i + 20)}"`)
  }
  for (const f of frags) for (const k of ['em', 'tr']) for (const x of f[k] ?? []) {
    if (!(f.text ?? '').includes(x)) errors.push(`${id}.${f.id}: ${k} „${x}" אינו במשפט`)
  }
}

const textOf = (ref) => { const [s, f] = ref.split('.'); return P[s]?.find((x) => x.id === f)?.text ?? '' }

/* 2 · תוויות המפה — חתוכות מ-§7/§8, ואין על המפה שם שהמקור לא נותן */
const R = L.route
const cutR = (where, label, ref) => { if (!textOf(ref).includes(label)) errors.push(`route/${where}: „${label}" אינו ב-${ref}`) }
cutR('start', R.start.label, R.start.from)
for (const g of R.goods) cutR('goods', g.label, g.from)
for (const e of R.empires) { cutR(e.side, e.label, e.from); cutR(e.side + '/tribe', e.tribe, e.from) }
if (R.points.length < 2) errors.push('route: אין דרך')
for (const [x, y] of R.points) if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) errors.push(`route: נקודה מחוץ לציור ${x},${y}`)

/* 2 · כרטיסי האימפריות (02) — כותרת כל כרטיס חתוכה מהמשפט שלו */
if (L.pair.cards.length !== 2) errors.push('pair: צריך שני כרטיסים')
for (const c of L.pair.cards) if (!textOf(c.name.from).includes(c.name.label)) errors.push(`pair/${c.side}: „${c.name.label}" אינו ב-${c.name.from}`)

/* 2 · הסרטון — כל כתובית חתוכה מהמשפט שלה, בזמנים עולים ובתוך הסרטון */
let prev = 0
for (const c of L.film.cues) {
  if (!textOf(c.from).includes(c.cut)) errors.push(`film: „${c.cut}" אינו ב-${c.from}`)
  if (!(c.start >= prev && c.end > c.start)) errors.push(`film: זמנים לא עולים ב-„${c.cut}"`)
  prev = c.end
}

/* 2 · האלילים בשמם, שלוש המילים */
for (const c of [L.words.caption]) if (!textOf(c.from).includes(c.cut)) errors.push(`„${c.cut}" אינו ב-${c.from}`)
const once = (ref, w, where) => { if (textOf(ref).split(w).length !== 2) errors.push(`${where}: „${w}" אינו ב-${ref} פעם אחת בדיוק`) }
for (const row of L.idols.rows) {
  if (!textOf(row.from).includes(row.caption)) errors.push(`idols: „${row.caption}" אינו ב-${row.from}`)
  for (const n of row.names) once(row.from, n, 'idols')
}
for (const c of L.words.cards) for (const w of [c.front, c.back, c.note].filter(Boolean)) once(L.words.caption.from, w, 'words')

const EDITORIAL = {
  ...Object.fromEntries(L.sections.map((s) => [s.id, s.title])),
  ...Object.fromEntries(L.sections.flatMap((s) => (s.subs ?? []).map((u) => [`${s.id}/${u.id}`, u.title]))),
}

/* 3 · פעם אחת — ב-layout ובקוד */
const used = new Map()
for (const s of L.sections) for (const r of s.uses) used.set(r, (used.get(r) ?? 0) + 1)
const all = Object.entries(P).flatMap(([s, fs]) => fs.map((f) => `${s}.${f.id}`))
for (const r of all) { const n = used.get(r) ?? 0; if (n !== 1) errors.push(`${r} נצרך ${n} פעמים`) }
for (const r of used.keys()) if (!all.includes(r)) errors.push(`layout מפנה לקטע שלא קיים: ${r}`)

const tsx = await readFile(new URL('../../web/src/components/chapter1/Chapter1Article.tsx', here), 'utf8')
const code = tsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')
/* a ref is §N.id — count it as a quoted literal */
const literal = (r) => code.split(`'${r}'`).length - 1
for (const s of L.sections) for (const r of s.uses) { const n = literal(r); if (n !== 1) errors.push(`Chapter1Article.tsx כותב את '${r}' ${n} פעמים (צריך 1)`) }
for (const r of [...code.matchAll(/'(§\d+\.[\w]+)'/g)].map((m) => m[1])) if (!used.has(r)) errors.push(`Chapter1Article.tsx מפנה ל-'${r}' שאינו ב-layout`)
/* a section's refs are printed inside that section: the Section/id the ref falls under */
for (const s of L.sections) {
  const open = code.indexOf(`<Section id="${s.id}"`)
  const close = code.indexOf('</Section>', open)
  if (open < 0) { errors.push(`Chapter1Article.tsx: אין <Section id="${s.id}">`); continue }
  const body = code.slice(open, close)
  for (const r of s.uses) if (!body.includes(`'${r}'`)) errors.push(`'${r}' מודפס מחוץ למקטע ${s.id}`)
}
if (SCOPE.length) {
  const order = L.sections.map((s) => code.indexOf(`<Section id="${s.id}"`))
  if (order.some((x, i) => i && x < order[i - 1])) errors.push('סדר המקטעים בקוד שונה מ-layout.json')
}

/* 5 · נכסים */
const art = new URL('../../web/public/assets/chapter1/article/', here)
const imgs = new Set([...[...code.matchAll(/img="([\w-]+)"/g)].map((m) => `${m[1]}.jpg`), L.film.src, L.film.poster, ...(L.film.narration ? [L.film.narration] : [])])
for (const f of imgs) { try { await access(new URL(f, art)) } catch { errors.push(`נכס חסר: ${f}`) } }

console.log(`היקף: ${SCOPE[0]}–${SCOPE[SCOPE.length - 1]} (${SCOPE.length} סעיפים) · קטעים: ${all.length} · מקטעים: ${L.sections.length} · ציורים: ${imgs.size}`)
console.log(`עורכי (מוצהר): ${Object.values(EDITORIAL).map((x) => `„${x}"`).join(' · ')}`)
if (errors.length) { console.log('❌ ' + errors.length + ' שגיאות:'); for (const e of errors) console.log('  · ' + e); process.exit(1) }
console.log('✅ נאמנות · כיסוי · פעם אחת בדיוק')
