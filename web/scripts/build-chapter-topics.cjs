/* Builds web/src/lib/chapter-topics.json — the chapters screen's search index.
   For every chapter: its section / sub-section titles (layout.json, chapter 6: data.ts) and the
   terms its passages teach (passages.json `term`, chapter 13: card names). Read-only on the
   chapter data; only Hebrew strings are kept (the search field is Hebrew).
   usage (from web/): npm run topics   — rerun after editing any chapter layout.json / passages.json */
const fs = require('fs')
const path = require('path')
const root = process.argv[2]
const HEB = /[א-ת]/
const SKIP = /^(בדיקת הבנה|סיום |סרטון הפתיחה|התרגול המסכם)/
const out = { $note: 'נבנה ב-scripts/build-chapter-topics.cjs (npm run topics) מ-layout.json/passages.json של כל פרק. לא לערוך ביד.' }

function collect(o, keys, set) {
  if (Array.isArray(o)) return o.forEach((x) => collect(x, keys, set))
  if (!o || typeof o !== 'object') return
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('$')) continue
    if (keys.includes(k) && typeof v === 'string') set.add(v)
    else if (keys.includes(k) && Array.isArray(v)) v.forEach((x) => typeof x === 'string' && set.add(x))
    else collect(v, keys, set)
  }
}
const read = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null)

for (let n = 1; n <= 16; n++) {
  const set = new Set()
  const dir = n === 1 ? path.join(root, 'chapter1', 'article') : path.join(root, `chapter${n}`)
  const layout = read(path.join(dir, 'layout.json'))
  if (layout) collect(layout.sections ?? layout, ['title', 'subtitle', 'heading'], set)
  const passages = read(path.join(dir, 'passages.json'))
  if (passages) collect(passages, n === 13 ? ['term', 'name'] : ['term'], set)
  if (n === 6) {
    const src = fs.readFileSync(path.join(root, 'chapter6', 'data.ts'), 'utf8')
    for (const m of src.matchAll(/"title":\s*"([^"]+)"/g)) set.add(m[1])
  }
  const list = [...set].map((s) => s.trim()).filter((s) => HEB.test(s) && !SKIP.test(s) && s.length <= 60)
  out[n] = [...new Set(list)]
}
fs.writeFileSync(path.join(root, 'chapter-topics.json'), JSON.stringify(out, null, 1) + '\n')
console.log(Object.entries(out).map(([k, v]) => k + ':' + (Array.isArray(v) ? v.length : '-')).join(' '))
console.log('bytes', fs.statSync(path.join(root, 'chapter-topics.json')).size)
