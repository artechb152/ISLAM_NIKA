/* Builds the subtitles of the Karbala film (section 04) from passages.json — never by hand.

   The film is rendered by film.swift WITHOUT slowing any clip (the stretched version stuttered —
   the user: „הסרטון קטוע"): still 1 zooms out 9s into karbala-a at real speed 8s, still 2
   zooms in 7s = 24s; still 3 (1.2s crossfade) 6s, karbala-b 8s, still 4 6s = 20s. 44s. The four fragments of
   layout.json `karbala.sequence` are the subtitles: the first two over the first clip,
   the last two over the second. Each fragment is cut into lines at its own punctuation
   (≤ 13 words a line) and every line gets time in proportion to its words.

   Output: web/src/lib/chapter9/karbala-cues.json  [[start, end, line], …]
           web/public/assets/chapter9/karbala-film.vtt
   verify-chapter9.mjs checks that the lines, joined, ARE the four fragments.
   Run: node concept/chapter9/build-karbala-cues.mjs */
import { readFile, writeFile } from 'node:fs/promises'
const web = new URL('../../web/', import.meta.url)
const P = JSON.parse(await readFile(new URL('src/lib/chapter9/passages.json', web), 'utf8')).passages
const L = JSON.parse(await readFile(new URL('src/lib/chapter9/layout.json', web), 'utf8'))
const groups = L.sections.find((s) => s.id === 'karbala').slots.sequence
const textOf = (ref) => { const [s, id] = ref.split('.'); return P[s].find((f) => f.id === id).text }
const SEGMENTS = [[0, 24, [0, 1]], [24, 44, [2, 3]]]
const MAX = 13

function lines(t) {
  /* break after , . ; : — or before a parenthesis — keeping every character */
  const bits = t.split(/(?<=[,.;:])\s+|\s+(?=\()/)
  /* a stub at the head of a fragment („מנגד,") goes forward into the line after it */
  while (bits.length > 1 && bits[0].split(' ').length < 4) bits.splice(0, 2, bits[0] + ' ' + bits[1])
  const out = []
  for (const b of bits) {
    const last = out[out.length - 1]
    const n = b.split(' ').length
    /* a stub of under four words never stands alone on screen */
    if (last && (last.split(' ').length + n <= MAX || n < 4)) out[out.length - 1] = last + ' ' + b
    else if (b.split(' ').length > MAX) {
      const w = b.split(' ')
      for (let i = 0; i < w.length; i += MAX) out.push(w.slice(i, i + MAX).join(' '))
    } else out.push(b)
  }
  return out
}

const cues = []
for (const [from, to, gi] of SEGMENTS) {
  const ls = gi.flatMap((g) => lines(groups[g].map(textOf).join(' ')))
  const words = ls.map((l) => l.split(' ').length)
  const total = words.reduce((a, b) => a + b, 0)
  let t = from + 0.4
  const span = to - from - 0.8
  ls.forEach((l, i) => {
    const d = (words[i] / total) * span
    cues.push([+t.toFixed(2), +(t + d - 0.15).toFixed(2), l])
    t += d
  })
}
await writeFile(new URL('src/lib/chapter9/karbala-cues.json', web), JSON.stringify(cues, null, 1))
const ts = (s) => `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(3).padStart(6, '0')}`
await writeFile(new URL('public/assets/chapter9/karbala-film.vtt', web), 'WEBVTT\n\n' + cues.map(([a, b, l], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${l}\n`).join('\n'))
console.log(cues.length, 'cues ·', cues.map((c) => (c[1] - c[0]).toFixed(1) + 's/' + c[2].split(' ').length + 'w').join(' '))
