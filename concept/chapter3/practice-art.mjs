/* Gives every practice question the comic panel it rests on.

   The questions already declare their sources — `"§26 §27"` — and every panel
   in the comic declares which § each of its beats came from. So the picture a
   question gets is not chosen, it is LOOKED UP: the panel that carries the
   question's first source. A reader who worked the chapter has already read
   that exact frame, and recognising it is half the exercise.

   The one hand-set case is the order question, whose four sources are four
   different moments; it takes the cover, because it is about the whole book. */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const P = JSON.parse(await readFile(new URL('../../web/src/lib/chapter3/practice.json', here), 'utf8'))
const C = JSON.parse(await readFile(new URL('../../web/src/lib/chapter3/comic.json', here), 'utf8'))

/* § → the first panel that carries it */
const bySection = new Map()
for (const panel of C.pages) {
  for (const b of panel.b) if (!bySection.has(b.s)) bySection.set(b.s, panel.a)
}

const BY_HAND = { order: 'cover' }   /* four moments at once — that is the book */

/* NO TWO QUESTIONS GET THE SAME FRAME. Two of them open on §26 and both landed
   on the same panel; a practice that shows one picture twice teaches the reader
   that the picture means nothing. Where the first source is already taken, the
   next source is used. */
const used = new Set()
let hit = 0
for (const q of P.questions) {
  const src = String(q.sources ?? '').split(/\s+/).filter(Boolean)
  const panel = BY_HAND[q.type]
    ?? src.map((s) => bySection.get(s)).find((a) => a && !used.has(a))
    ?? src.map((s) => bySection.get(s)).find(Boolean)
  if (!panel) { console.warn(`· ${q.id}: no panel for ${q.sources}`); continue }
  q.photo = `comic/${panel}.jpg`
  used.add(panel)
  hit++
  console.log(`${String(hit).padStart(2)} ${q.label.padEnd(26)} ${q.sources.padEnd(18)} → ${panel}`)
}

await writeFile(new URL('../../web/src/lib/chapter3/practice.json', here),
  JSON.stringify(P, null, 2) + '\n')
console.log(`\n${hit}/${P.questions.length} questions now carry the frame they were drawn from`)
