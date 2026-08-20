/* Regenerate public/assets/ch6-story.vtt from the on-screen cues.

   The styled captions in the player and the <track> caption file must say the same thing at the
   same second; keeping two hand-written copies is how they drift. film-cues.ts is the source,
   this script is the only way the .vtt is written.

   Usage: node scripts/build-film-vtt.mjs */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(here, '../src/components/chapter6/film-cues.ts')
const OUT = resolve(here, '../public/assets/ch6-story.vtt')

const source = readFileSync(SRC, 'utf8')
const body = source.slice(source.indexOf('FILM_CUES'))

/* each entry is [start, end, 'text'] or [start, end, "text"] on one line */
const cues = []
for (const m of body.matchAll(/\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*(['"])([\s\S]*?)\3\s*,?\s*\]/g)) {
  cues.push({ start: Number(m[1]), end: Number(m[2]), text: m[4] })
}
if (!cues.length) {
  console.error('build-film-vtt: no cues found in film-cues.ts')
  process.exit(1)
}

function stamp(seconds) {
  const ms = Math.round(seconds * 1000)
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  return `${h}:${m}:${s}.${String(ms % 1000).padStart(3, '0')}`
}

const out =
  'WEBVTT\n\n' +
  cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n')

writeFileSync(OUT, out, 'utf8')
console.log(`build-film-vtt: wrote ${cues.length} cues → ${OUT}`)

/* a cue that starts before the previous one ends would double-render in native caption UI */
for (let i = 1; i < cues.length; i++) {
  if (cues[i].start < cues[i - 1].end) {
    console.warn(`  overlap: cue ${i} starts ${cues[i].start}s before cue ${i} ends ${cues[i - 1].end}s`)
  }
}
