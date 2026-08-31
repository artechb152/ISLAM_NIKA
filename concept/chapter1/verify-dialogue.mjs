/* Bidirectional fidelity check: dialogue.json ↔ SOURCE-TEXT.md
   1. Every dialogue line carries a source §N that exists in SOURCE-TEXT.
   2. Every §N in SOURCE-TEXT is spoken at least once (0 orphans).
   3. Blacklist guard: forbidden inventions must not appear.
   Run: node verify-dialogue.mjs */
import { readFile } from 'node:fs/promises'

const dir = new URL('.', import.meta.url)
/* The live file, not the copy that used to sit beside this script. There were
   two dialogue.json — this folder's and the game's — and they had drifted 16
   encounters apart, so the fidelity gate was checking text no player has seen
   since the content pass of 26.8. A gate pointed at a stale copy is worse than
   no gate: it reports green over unverified content. */
const dlg = JSON.parse(await readFile(new URL('../../web/src/lib/chapter1/dialogue.json', dir), 'utf8'))
const src = await readFile(new URL('SOURCE-TEXT.md', dir), 'utf8')

const sourceSections = new Set([...src.matchAll(/^#{2,3} (§\d+)/gm)].map((m) => m[1]))

const spoken = new Map() // §N -> count
const errors = []
const collect = (lines, where) => {
  for (const l of lines ?? []) {
    if (!l.source || !/^§\d+$/.test(l.source)) errors.push(`שורה בלי מקור תקין ב־${where}: "${(l.text ?? '').slice(0, 40)}…"`)
    else if (!sourceSections.has(l.source)) errors.push(`מקור לא קיים ${l.source} ב־${where}`)
    else spoken.set(l.source, (spoken.get(l.source) ?? 0) + 1)
    if (!l.text?.trim()) errors.push(`שורה ריקה ב־${where}`)
  }
}
let notebooks = new Set()
for (const r of dlg.regions) {
  for (const e of r.encounters) {
    collect(e.lines, `${r.id}/${e.id}`)
    collect(e.rawi_followup, `${r.id}/${e.id}/rawi`)
    for (const c of e.choices ?? []) collect(c.lines, `${r.id}/${e.id}/choice`)
    if (e.notebook) notebooks.add(e.notebook)
    if (!dlg.speakers[e.speaker]) errors.push(`דובר לא מוכר: ${e.speaker} ב־${e.id}`)
  }
}

const unspoken = [...sourceSections].filter((s) => !spoken.has(s))
if (unspoken.length) errors.push(`סעיפים שאף אחד לא אומר: ${unspoken.join(', ')}`)

// blacklist — inventions that were removed and must not return
const allText = JSON.stringify(dlg)
for (const [bad, why] of [
  ['שנת הפיל', 'שם פרק שהומצא'],
  ['באותה שנה נולד', 'לידת מוחמד לא בטקסט'],
  ['אני בעל הגמלים', 'נאום עבד אל-מטלב שהומצא'],
  ['פינוי מכה', 'לא בטקסט'],
]) if (allText.includes(bad)) errors.push(`רשימה שחורה: "${bad}" (${why})`)

// notebook coverage 1..26
for (let i = 1; i <= 26; i++) if (!notebooks.has(i)) errors.push(`פריט מחברת חסר: ${i}`)

console.log(`סעיפי מקור: ${sourceSections.size} · מדוברים: ${spoken.size} · פריטי מחברת: ${notebooks.size}/26`)
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
console.log('✅ נאמנות מלאה: כל שורה עם מקור, כל סעיף מדובר, אפס המצאות.')
