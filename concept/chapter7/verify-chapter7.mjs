/* שער פרק 7 — נאמנות · כיסוי · פעם אחת בדיוק.

   1. רצף   — לכל §N, הרצף של הקטעים שלו ב-passages.json (num, name, text, לפי הסדר)
              זהה לסעיף ב-SOURCE-TEXT.md אחרי הסרת רווחים ופיסוק. כלומר לא רק „כל קטע
              נמצא במקור" אלא „הקטעים יחד הם הסעיף, לא פחות ולא יותר".
   2. תוויות — label, em, tr וכל תווית ב-layout.json שנחתכה מהטקסט: תת-מחרוזת של
              הסעיף שלה. מה שעורכי (כפתורים, הנחיות) מוצהר כאן בשמו.
   3. פעם אחת — כל קטע נצרך ב-layout.json בדיוק פעם אחת (`uses` של מקטע, או מנגנון),
              ו-Chapter7.tsx כותב כל ref של `uses` פעם אחת בדיוק ואף ref של מנגנון.

   ריצה: node concept/chapter7/verify-chapter7.mjs */
import { readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const P = JSON.parse(await readFile(new URL('../../web/src/lib/chapter7/passages.json', here), 'utf8')).passages
const L = JSON.parse(await readFile(new URL('../../web/src/lib/chapter7/layout.json', here), 'utf8'))

const flat = (s) => String(s).replace(/[\s„“”"'.,:;()\[\]–—\-?!]/g, '')
const secs = Object.fromEntries([...src.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---)/gm)].map(([, id, t]) => [id, t.trim()]))
const errors = []

/* 1 · רצף */
for (const id of Object.keys(secs)) if (!P[id]) errors.push(`${id} קיים במקור ואין לו קטעים`)
for (const [id, frags] of Object.entries(P)) {
  if (!secs[id]) { errors.push(`${id} לא קיים ב-SOURCE-TEXT`); continue }
  const seq = frags.map((f) => [f.num != null ? `${f.num}.` : '', f.name ?? '', f.text ?? ''].join('')).join('')
  if (flat(seq) !== flat(secs[id])) {
    const a = flat(seq), b = flat(secs[id]); let i = 0; while (i < a.length && a[i] === b[i]) i++
    errors.push(`${id}: הרצף סוטה מהמקור אחרי ${i} תווים — „…${a.slice(Math.max(0, i - 20), i)}‖${a.slice(i, i + 20)}" מול „${b.slice(i, i + 20)}"`)
  }
  /* 2 · תוויות בתוך הקטעים */
  for (const f of frags) {
    for (const k of ['em', 'tr']) for (const x of f[k] ?? []) if (!(f.text ?? '').includes(x)) errors.push(`${id}.${f.id}: ${k} „${x}" אינו במשפט`)
    if (f.label && !secs[id].includes(f.label)) errors.push(`${id}.${f.id}: label „${f.label}" אינו בסעיף`)
  }
}

/* 2 · תוויות ב-layout שנחתכו מהטקסט */
const textOf = (ref) => { const [s, f] = ref.split('.'); return P[s]?.find((x) => x.id === f)?.text ?? '' }
const cut = (where, phrase, inText) => { if (!inText.includes(phrase)) errors.push(`${where}: „${phrase}" אינו בטקסט`) }
for (const st of L.drift.stops) {
  cut('drift', st.year, secs['§4']); cut('drift', st.date, secs['§4'])
  if (st.note) cut('drift', st.note, secs['§4'])
  if (st.caption) cut('drift', st.caption, secs['§4'])
  if (!st.date.startsWith(String(st.day) + ' ')) errors.push(`drift ${st.year}: היום ${st.day} אינו היום שבתאריך „${st.date}"`)
}
cut('sighting.notSeen', L.sighting.notSeen, textOf('§5.c')); cut('sighting.seen', L.sighting.seen, textOf('§5.c'))
for (const n of [L.gap.lunar, L.gap.solar, L.gap.gap, L.gap.lunarLabel, L.gap.solarLabel, L.gap.gapLabel]) cut('gap', String(n), secs['§0'])
for (const s of L.sections) if (s.term && !src.includes(s.term)) errors.push(`${s.id}: המונח „${s.term}" אינו במקור`)
const EDITORIAL = {
  ...Object.fromEntries(L.sections.map((s) => [s.id, s.title])),
  ...Object.fromEntries(L.sections.flatMap((s) => (s.subs ?? []).map((u) => [`${s.id}/${u.id}`, u.title]))),
  'legend.holy': L.legend.holy, 'drift.month': L.drift.month, 'sighting.hint': L.sighting.hint,
}

/* 3 · פעם אחת — ב-layout, וגם בקוד */
const used = new Map()
const use = (ref, where) => used.set(ref, [...(used.get(ref) ?? []), where])
for (const s of L.sections) {
  for (const r of s.uses) use(r, s.id)
  for (const [d, refs] of Object.entries(s.devices ?? {})) for (const r of refs) use(r, `${s.id}/${d}`)
}
const all = Object.entries(P).flatMap(([s, fs]) => fs.map((f) => `${s}.${f.id}`))
for (const r of all) { const n = used.get(r)?.length ?? 0; if (n !== 1) errors.push(`${r} נצרך ${n} פעמים${n ? ' (' + used.get(r).join(', ') + ')' : ''}`) }
for (const r of used.keys()) if (!all.includes(r)) errors.push(`layout מפנה לקטע שלא קיים: ${r}`)

/* הקוד מדפיס בדיוק את מה ש-layout אומר: כל ref של `uses` כתוב ב-Chapter7.tsx פעם
   אחת בדיוק, ו-ref של מנגנון לא כתוב בו בכלל (המנגנון קורא אותו מהנתונים) */
const tsx = await readFile(new URL('../../web/src/components/Chapter7.tsx', here), 'utf8')
const code = tsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')
const literal = (r) => (code.match(new RegExp(`'${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g')) ?? []).length
for (const s of L.sections) {
  for (const r of s.uses) { const n = literal(r); if (n !== 1) errors.push(`Chapter7.tsx כותב את '${r}' ${n} פעמים (צריך 1)`) }
  for (const refs of Object.values(s.devices ?? {})) for (const r of refs) if (literal(r)) errors.push(`Chapter7.tsx כותב את '${r}' — הוא של מנגנון`)
}
const inCode = [...code.matchAll(/'(§\d+\.[\w]+)'/g)].map((m) => m[1])
for (const r of inCode) if (!used.has(r)) errors.push(`Chapter7.tsx מפנה ל-'${r}' שאינו ב-layout`)

const holy = L.holy.map((r) => P['§8'].find((f) => `§8.${f.id}` === r)?.num)
if (holy.join() !== '1,7,11,12') errors.push(`החודשים הקדושים בנתונים ${holy} ולא 1,7,11,12 כמו ב-§1.b`)

console.log(`· עורכי, מחוץ למקור: ${Object.entries(EDITORIAL).map(([k, v]) => `${k}=„${v}"`).join(' · ')}`)
if (errors.length) { console.log('❌ ' + errors.length + ' כשלים:\n  ' + errors.join('\n  ')); process.exit(1) }
console.log(`✅ ${Object.keys(P).length} סעיפים · ${all.length} קטעים · רצף זהה למקור · כל קטע פעם אחת ב-layout ובקוד · קדושים 1/7/11/12`)
