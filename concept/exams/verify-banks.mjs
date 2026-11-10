/* שער מאגרי חדר המבחנים (9.11.2026: „שכל הפרקים יהיו חלק מהמבחנים").

   למאגרים 1–7 לא היה שער. הכללים של התרגולים — שאלה נשענת על § ואף תשובה אינה ממציאה עובדה —
   נשארו הצהרה בראש types.ts. כאן הם נבדקים, לכל מאגר:

     · מבנה — id `chN-qNN` ייחודי, `chapter` תואם, ושלוש הרמות (1·2·3) קיימות.
       single: תשובה נכונה אחת בדיוק (ולפחות 3 אפשרויות) · multi: 2 נכונות ולפחות אחת שגויה (4+) ·
       match: 3+ זוגות, צדדים ייחודיים.
     · `sources` — כל § קיים במקור של הפרק.
     · נאמנות — כל אפשרות / צד של התאמה, אחרי הסרת ניקוד ופיסוק, מופיעים במקור, או מוצהרים ב-
       `declared` של המאגר (`{ "ביטוי": "סיבה" }`). מוצהר = מסיח או ניסוח שאינו במקור; לא יותר
       מ-35% מהביטויים, וכל הצהרה חייבת להיות בשימוש.
     · גודל — לפחות 36 שאלות סגורות (פתוחות אינן נשלפות למבחן).

   המקור: concept/chapterN/SOURCE-TEXT.md אם קיים (בין כותרת הפרק להערות העריכה, בלי תיאורי
   תמונה בסוגריים מרובעים), אחרת כל המחרוזות של web/src/lib/chapterN/passages.json.

   ריצה: node concept/exams/verify-banks.mjs [פרק …]   (בלי ארגומנטים — כל המאגרים) */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const root = new URL('../../', import.meta.url)
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳*.,:;()\[\]–—\-?!־‎‏]/g, '')

async function sourceOf(n) {
  const md = new URL(`concept/chapter${n}/SOURCE-TEXT.md`, root)
  if (existsSync(md)) {
    const t = await readFile(md, 'utf8')
    const a = t.search(/^## פרק/m)
    const b = t.indexOf('## הערות עריכה')
    const body = (a >= 0 ? t.slice(a, b > a ? b : undefined) : t).replace(/\[[^\]]*\]/g, '')
    const secs = new Set([...t.matchAll(/^### (§\d+)/gm)].map((m) => m[1]))
    return { text: body, secs, kind: 'SOURCE-TEXT' }
  }
  const js = JSON.parse(await readFile(new URL(`web/src/lib/chapter${n}/passages.json`, root), 'utf8'))
  const out = []
  const secs = new Set()
  const walk = (v, key) => {
    if (typeof v === 'string') { if (key !== '$note') out.push(v); return }
    if (Array.isArray(v)) return v.forEach((x) => walk(x, key))
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (/^§\d+/.test(k)) secs.add(k.match(/^§\d+/)[0]); walk(x, k) }
  }
  walk(js)
  return { text: out.join('\n'), secs, kind: 'passages.json' }
}

const want = process.argv.slice(2).map(Number).filter(Boolean)
const files = (await readdir(new URL('web/src/lib/exams/banks/', root))).filter((f) => /^ch\d+\.json$/.test(f))
const errors = []
const info = []
for (const f of files.sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)))) {
  const n = parseInt(f.slice(2))
  if (want.length && !want.includes(n)) continue
  const bank = JSON.parse(await readFile(new URL(`web/src/lib/exams/banks/${f}`, root), 'utf8'))
  const err = (m) => errors.push(`ch${n}: ${m}`)
  if (bank.chapter !== n) err(`chapter=${bank.chapter}`)
  const src = await sourceOf(n)
  const F = flat(src.text)
  const declared = bank.declared ?? {}
  const declFlat = new Map(Object.entries(declared).map(([k, v]) => [flat(k), v]))
  const usedDecl = new Set()
  const ids = new Set(); const diffs = new Set()
  let closed = 0, phrases = 0, decl = 0
  for (const q of bank.questions) {
    if (!new RegExp(`^ch${n}-q\\d{2,3}$`).test(q.id)) err(`id ${q.id}`)
    if (ids.has(q.id)) err(`id כפול ${q.id}`); ids.add(q.id)
    if (![1, 2, 3].includes(q.difficulty)) err(`${q.id}: difficulty`)
    diffs.add(q.difficulty)
    if (!q.prompt || !q.ok || !q.sources) err(`${q.id}: חסר prompt/ok/sources`)
    for (const s of String(q.sources ?? '').split(/[\s,]+/).filter(Boolean)) if (src.secs.size && !src.secs.has(s)) err(`${q.id}: ${s} אינו במקור`)
    if (q.type === 'open') continue
    closed++
    let list = []
    if (q.type === 'single' || q.type === 'multi') {
      const r = q.options.filter((o) => o.right).length
      if (q.type === 'single' && (r !== 1 || q.options.length < 3)) err(`${q.id}: single צריך 1 נכונה ו-3+ אפשרויות`)
      if (q.type === 'multi' && (r < 2 || r >= q.options.length || q.options.length < 4)) err(`${q.id}: multi צריך 2+ נכונות, אחת שגויה לפחות, 4+ אפשרויות`)
      const t = q.options.map((o) => flat(o.text)); if (new Set(t).size !== t.length) err(`${q.id}: אפשרות כפולה`)
      list = q.options.map((o) => o.text)
    } else if (q.type === 'match') {
      if (q.pairs.length < 3) err(`${q.id}: match צריך 3+ זוגות`)
      const L = q.pairs.map((p) => flat(p.left)), R = q.pairs.map((p) => flat(p.right))
      if (new Set(L).size !== L.length || new Set(R).size !== R.length) err(`${q.id}: צד כפול בהתאמה`)
      list = q.pairs.flatMap((p) => [p.left, p.right])
    } else err(`${q.id}: type ${q.type}`)
    for (const ph of list) {
      phrases++
      const k = flat(ph)
      if (F.includes(k)) continue
      if (declFlat.has(k)) { usedDecl.add(k); decl++; continue }
      err(`${q.id}: „${ph}" אינו במקור ואינו מוצהר`)
    }
  }
  for (const k of declFlat.keys()) if (!usedDecl.has(k)) err(`הצהרה שאין בה שימוש: „${[...Object.keys(declared)].find((x) => flat(x) === k)}"`)
  if (phrases && decl / phrases > 0.35) err(`יותר מ-35% מהביטויים מוצהרים (${decl}/${phrases})`)
  if (diffs.size < 3) err('חסרה רמת קושי')
  if (closed < 36) err(`רק ${closed} שאלות סגורות (צריך 36+)`)
  info.push(`ch${n}: ${closed} סגורות · ${bank.questions.length - closed} פתוחות · מקור ${src.kind} · מוצהרים ${decl}/${phrases}`)
}
console.log(info.join('\n'))
if (errors.length) { console.error(`❌ ${errors.length} שגיאות:`); for (const e of errors.slice(0, 80)) console.error('  · ' + e); if (errors.length > 80) console.error(`  … ועוד ${errors.length - 80}`); process.exit(1) }
console.log(`✅ ${info.length} מאגרים`)
