/* Section 04's film WITH VOICE — v2 (12.10.2026, the user chose „Xavier" on Eleven v4).
   Each of the four §5 fragments is ONE continuous recording (assets/vo/fN.mp3) — the first
   build recorded per subtitle line and the narrator stopped mid-sentence („להכיר | בו
   כח'ליף"), which read as robotic. The narrator reads assets/vo/spoken.json (Arabic names
   in Arabic script, build-spoken.mjs); the SUBTITLES stay the source's words.
   Inside a recording, each subtitle line gets time in proportion to the length of what
   is spoken for it. Fragments 1–2 over the first clip, 3–4 over the second. */
import { readFile, writeFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url), web = new URL('../../web/', import.meta.url)
const spoken = JSON.parse(await readFile(new URL('assets/vo/spoken.json', here), 'utf8'))
const frs = JSON.parse(await readFile(new URL('assets/vo/fragments.json', here), 'utf8'))
const dur = Object.fromEntries((await readFile(new URL('assets/vo/fdur.txt', here), 'utf8')).trim().split('\n').map((l) => { const [f, d] = l.split(' '); return [f, +d] }))
const GAP = 0.7, SECOND_FROM = 41.6
let t = 0.8; const out = [], starts = []
frs.forEach((f, k) => {
  if (k === 2) t = SECOND_FROM + 0.8
  const d = dur[`f${k + 1}.mp3`]; starts.push(t.toFixed(3))
  const lens = f.lines.map((i) => spoken[i - 1].spoken.length), all = lens.reduce((a, b) => a + b, 0)
  let u = t
  f.lines.forEach((i, j) => { const len = (lens[j] / all) * d; out.push([+u.toFixed(2), +(u + len + (j === f.lines.length - 1 ? 0.3 : -0.05)).toFixed(2), spoken[i - 1].subtitle]); u += len })
  t += d + GAP
})
if (out[5][1] > SECOND_FROM) throw new Error('first half overruns: ' + out[5][1])
await writeFile(new URL('src/lib/chapter9/karbala-cues.json', web), JSON.stringify(out, null, 1))
const ts = (s) => `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(3).padStart(6, '0')}`
await writeFile(new URL('public/assets/chapter9/karbala-film.vtt', web), 'WEBVTT\n\n' + out.map(([a, b, l], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${l}\n`).join('\n'))
await writeFile(new URL('assets/vo/timeline.txt', here), starts.join('\n'))
console.log('end', out[out.length - 1][1], starts.join(' '))
