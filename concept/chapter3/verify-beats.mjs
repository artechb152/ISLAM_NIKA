/* Chapter 3 · the beat gate.

   The chapter's original invariant was that not one sentence in it was mine.
   That is over: the comic rewords the source into beats. This gate is what
   replaces it, and it is deliberately weaker in one place and stronger in
   another.

   WEAKER: a narration beat is no longer checked against the source wording.
   STRONGER, and this is the point:
     1. every beat names a §N that exists in SOURCE-TEXT.md
     2. every one of the 45 sections is covered by at least one beat — nothing
        can quietly fall out of the chapter while being reworded
     3. a beat marked `v` (a Quranic verse or a line of direct speech) IS still
        checked verbatim against the source. Those are never reworded.
     4. the count of reworded beats is PRINTED on every run. The departure from
        the original invariant stays visible instead of becoming invisible.

   Run: node concept/chapter3/verify-beats.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const B = JSON.parse(await readFile(new URL('beats.json', here), 'utf8'))
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')

const flat = (s) => s.replace(/[\s„”"'.,:;()\[\]–—-]/g, '')
const flatSrc = flat(src)
const sections = new Set([...src.matchAll(/^#{3} (§\d+)/gm)].map((m) => m[1]))

const errors = []
const covered = new Set()
let beats = 0
let verbatim = 0
let words = 0

for (const part of B.parts) {
  if (!part.beats?.length) errors.push(`${part.id}: אין ביטים`)
  for (const b of part.beats ?? []) {
    beats++
    words += b.t.split(/\s+/).length
    covered.add(b.s)
    if (!sections.has(b.s)) errors.push(`${part.id}: ${b.s} אינו קיים ב־SOURCE-TEXT`)
    if (b.v) {
      verbatim++
      if (!flatSrc.includes(flat(b.t))) {
        errors.push(`${part.id}: ציטוט שאינו במקור — "${b.t.slice(0, 44)}…"`)
      }
    }
    if (b.t.split(/\s+/).length > 22) {
      errors.push(`${part.id}: ביט של ${b.t.split(/\s+/).length} מילים — זו כבר פסקה`)
    }
  }
}

const missing = [...sections].filter((s) => !covered.has(s))
if (missing.length) errors.push(`סעיפים שאינם מכוסים באף ביט: ${missing.join(' ')}`)

const reworded = beats - verbatim
console.log(
  `ביטים: ${beats} · מילים לביט: ${(words / beats).toFixed(1)} · ` +
    `סעיפים מכוסים: ${covered.size}/${sections.size}`,
)
console.log(
  `⚠ ${reworded} ביטים אינם לשון המקור. ${verbatim} ציטוטים נבדקו מילה במילה ועברו.`,
)

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  process.exit(1)
}
console.log('✅ כל הפניה קיימת · כל 45 הסעיפים מכוסים · כל ציטוט מאומת')
