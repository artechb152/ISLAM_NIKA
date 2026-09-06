/* Maps the 151 beats onto 75 panels, and carries the existing art across.

   The 58 panels already drawn were built one-per-source-fragment. The beats cut
   the same sections finer, so most new panels land on a section that already
   has a picture — those reuse it. Only what has no match needs producing.

   Writes panels75.json. panels.json is left alone: it is what the 58 existing
   pictures were produced against, and overwriting it would erase the record of
   what each of them was checked for. */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const B = JSON.parse(await readFile(new URL('beats.json', here), 'utf8'))
const OLD = JSON.parse(await readFile(new URL('panels.json', here), 'utf8'))

/* section → the old panels that covered it, in order */
const bySection = new Map()
for (const p of OLD.panels) {
  for (const s of new Set(p.captions.map((c) => c.split('.')[0]))) {
    if (!bySection.has(s)) bySection.set(s, [])
    bySection.get(s).push(p)
  }
}
const used = new Set()
const takeArt = (secs) => {
  for (const s of secs) {
    for (const p of bySection.get(s) ?? []) {
      if (!used.has(p.id)) { used.add(p.id); return p }
    }
  }
  return null
}

/* TARGET: 75 panels for 151 beats. A naive two-per-panel chunker that also
   gave every verse a panel of its own produced 86 — eleven too many. Two rules
   bring it to target without crowding anything:
     · a lead-in and the verse it introduces share a panel. They are one beat of
       reading; splitting them put a colon on one page and its sentence on the
       next.
     · each part is given a share of the 75 in proportion to its beats, and its
       beats are spread evenly over that share, so a dense part gets threes and
       a sparse one gets twos rather than the count drifting. */
const TARGET = 75
const total = B.parts.reduce((a, p) => a + p.beats.length, 0)
const solo = (b) => b.v

const panels = []
let n = 0
let budget = TARGET
for (const [pi, part] of B.parts.entries()) {
  const q = [...part.beats]
  /* this part's share of the 75, with the last part taking whatever is left */
  const share = pi === B.parts.length - 1
    ? Math.max(1, budget)
    : Math.max(1, Math.round((part.beats.length / total) * TARGET))
  budget -= share
  let left = share
  while (q.length) {
    const per = Math.max(1, Math.ceil(q.length / Math.max(1, left)))
    const chunk = [q.shift()]
    /* a lead-in carries its verse with it */
    if (chunk[0].lead && q.length) chunk.push(q.shift())
    while (chunk.length < per && q.length && !solo(q[0]) && !chunk.some(solo)) chunk.push(q.shift())
    left--
    const secs = [...new Set(chunk.map((b) => b.s))]
    const src = takeArt(secs)
    n++
    panels.push({
      id: 'q' + String(n).padStart(2, '0'),
      part: part.title,
      epilogue: !!part.epilogue,
      grid: chunk.some((b) => b.v && b.t.length > 40) ? 'splash'
        : part.epilogue ? 'nine' : 'six',
      beats: chunk.map((b) => ({ s: b.s, t: b.t, v: !!b.v })),
      art: src ? src.id : null,
      must: src ? src.must : null,
      mustNot: src ? src.mustNot : null,
      needsArt: !src,
    })
  }
}

const missing = panels.filter((p) => p.needsArt)
await writeFile(new URL('panels75.json', here), JSON.stringify({
  $note: 'הפאנלים של הקומיקס: 151 ביטים על ' + panels.length + ' פאנלים. שדה art מצביע על נכס קיים מתוך 58 שכבר הופקו; needsArt מסמן פאנל שאין לו עדיין ציור.',
  $art: 'panels.json נשאר כמות שהוא — הוא הרישום של מה שכל אחת מ-58 התמונות נבדקה מולו, ואסור למחוק אותו.',
  panels,
}, null, 2) + '\n')

console.log(`פאנלים: ${panels.length} · ביטים: ${panels.reduce((a, p) => a + p.beats.length, 0)}`)
console.log(`נכסים קיימים בשימוש: ${used.size} · דורשים ציור חדש: ${missing.length}`)
console.log('חסרים:', missing.map((p) => p.id + '(' + [...new Set(p.beats.map((b) => b.s))].join(',') + ')').join(' '))
