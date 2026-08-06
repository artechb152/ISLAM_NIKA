/* Every label the closing exercise asks the learner to place must be a SUBSTRING of the field
   in data.ts it was quoted from — not „based on“ it, not a paraphrase, not a retyping.

   This check exists because it was missing. An earlier draft of the screen printed „ולעלות
   לרגל“ where the source says „לעלות לרגל“; the extra letter came from a sentence the verb
   appears in, and nobody noticed, because nothing compared the two files. Now something does.

   Run: node scripts/check-summary-sources.mjs      (also runs as part of `npm run verify`)

   Hints, leads and instructions are NOT checked: they are framing written for this screen.
   Labels, cues, decoys, bank entries, the situations, the closing quote and the end-screen
   quote are content, and are. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', 'src', 'lib', 'chapter6')

const { CH6 } = await import('file://' + join(src, 'data.ts').replaceAll('\\', '/'))
const D = await import('file://' + join(src, 'summary-data.ts').replaceAll('\\', '/'))

/* every string a screen holds, flattened, so „is this quoted from sh-3“ is one lookup */
function textOf(screen) {
  const out = []
  const walk = (v) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(screen)
  return out
}

const byId = new Map(CH6.screens.map((s) => [s.id, textOf(s)]))
const everything = CH6.screens.flatMap(textOf)

const failures = []
const checked = []

/* the source strings use a typographic maqaf and curly quotes in places; nothing else is
   normalised, because normalising is how a mismatch becomes invisible */
const norm = (s) => s.replace(/\s+/g, ' ').trim()

function assertQuoted(label, screenIds, where) {
  if (!label) return
  const n = norm(label)
  const pool = screenIds.length
    ? screenIds.flatMap((id) => {
        if (!byId.has(id)) failures.push(`${where}: אין מסך בשם „${id}“ ב-data.ts`)
        return byId.get(id) ?? []
      })
    : everything
  const hit = pool.some((field) => norm(field).includes(n))
  checked.push(n)
  if (!hit) {
    const loose = everything.some((field) => norm(field).includes(n))
    failures.push(
      `${where}: „${n}“ אינה תת־מחרוזת של ${screenIds.join(', ') || 'המקור'}` +
        (loose ? ' (היא כן מופיעה במקום אחר בפרק — המקור המוצהר שגוי)' : '')
    )
  }
}

/* ---- the five commandment names ---- */
for (const p of D.PILLARS) assertQuoted(p.name, ['01'], `שם המצווה · ${p.key}`)

/* ---- the five exercises ---- */
for (const ex of D.EXERCISES) {
  const w = `תרגיל ${ex.key}`
  assertQuoted(ex.title, [], `${w} · כותרת`)
  for (const slot of ex.slots) {
    assertQuoted(slot.answer, ex.sources, `${w} · משבצת ${slot.n}`)
  }
  for (const d of ex.decoys) assertQuoted(d, ex.sources, `${w} · מסיח`)
  assertQuoted(ex.done, ex.sources, `${w} · סיום`)

  const b = ex.beat
  const bw = `פעימה ${ex.key}`
  for (const slot of b.slots) assertQuoted(slot.answer, b.sources, `${bw} · משבצת ${slot.n}`)
  for (const item of b.bank) assertQuoted(item, b.sources, `${bw} · מגש`)
  if (b.arabic) assertQuoted(b.arabic, b.sources, `${bw} · ערבית`)
  /* the sentence with its gaps filled back in must read as the source reads */
  if (b.sentence) {
    let filled = b.sentence
    for (const slot of b.slots) filled = filled.replace(`[${slot.n}]`, slot.answer)
    if (/\[\d\]/.test(filled)) failures.push(`${bw}: נותרה משבצת בלי תשובה במשפט`)
  }
}

/* ---- the multiple-choice questions ----
   EVERY option is checked, not only the right one. A wrong option that is not a real phrase
   from the chapter is an invented fact wearing the costume of a distractor — the reader has no
   way to tell the two apart, and a plausible-sounding invention is worse than an obvious one. */
function assertMcq(q, where) {
  /* the stem is checked only where it is declared as quoted — „מתי, לפי המסורת, ירד הקוראן?“
     is a question written for this screen, and asking a question about the chapter is framing */
  if (q.stemFromSource) assertQuoted(q.question, q.sources, `${where} · שאלה`)
  for (const o of q.options) assertQuoted(o, q.sources, `${where} · אפשרות`)
  if (!q.options.includes(q.answer)) failures.push(`${where}: התשובה אינה אחת מן האפשרויות`)
  assertQuoted(q.answer, q.sources, `${where} · תשובה`)
}
for (const q of D.QUIZ) assertMcq(q, `שאלה ${q.id}`)
for (const ex of D.EXERCISES) {
  if (ex.beat.mcq) assertMcq(ex.beat.mcq, `פעימה ${ex.key} · רב־ברירה`)
}

/* ---- the closing and the end ---- */
assertQuoted(D.CLOSING.ok, ['01'], 'סיום · הציטוט')
assertQuoted(D.CLOSING.okNote, ['hj-1'], 'סיום · ההסבר')
assertQuoted(D.END.quote, ['01'], 'סוף · תשובת מוחמד')

/* ---- report ---- */
if (failures.length) {
  console.error(`\n✗ ${failures.length} מתוך ${checked.length} מחרוזות אינן תואמות את המקור:\n`)
  for (const f of failures) console.error('  · ' + f)
  console.error('')
  process.exit(1)
}
console.log(`✓ כל ${checked.length} המחרוזות בתרגול הן ציטוט מדויק מ-data.ts`)
