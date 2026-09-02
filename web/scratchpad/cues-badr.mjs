import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

/* כתוביות לסרט של כל מקטע בדר. כל שורה היא רצף מדויק מהמקור: הפיצול נעשה
   בגבולות פסוקיות, והסקריפט מסרב לכתוב אלא אם החלקים של כל §N מתחברים
   בחזרה למשפט המדויק — כך אף מילה לא נופלת בין שתי שורות. */
const d = JSON.parse(fs.readFileSync('src/lib/chapter4/passages.json', 'utf8'))
const L = JSON.parse(fs.readFileSync('src/lib/chapter4/layout.json', 'utf8'))
const t = (ref) => {
  const [s, i] = ref.split('.')
  const f = d.passages[s].find((x) => x.id === i)
  return f.list ? f.list.join(' ') : f.text
}
const refs = Object.values(L.sections.find((s) => s.id === 'badr').slots).flat()

/* מפצלים כל משפט בפסיקים ובנקודות, בלי לגעת במילים */
const splitSentence = (text) => {
  const out = []
  let buf = ''
  for (const part of text.split(/(?<=[,.:])\s+/)) {
    buf = buf ? `${buf} ${part}` : part
    if (buf.length >= 42) {
      out.push(buf)
      buf = ''
    }
  }
  if (buf) {
    if (out.length && buf.length < 18) out[out.length - 1] += ' ' + buf
    else out.push(buf)
  }
  return out
}

const lines = []
for (const ref of refs) {
  const whole = t(ref)
  const parts = splitSentence(whole)
  if (parts.join(' ') !== whole) {
    throw new Error(`הפיצול של ${ref} אינו מרכיב בחזרה את המשפט`)
  }
  for (const x of parts) lines.push(x)
}

/* אורך הקריינות בפועל */
const FF = process.argv[2]
/* ffmpeg -i בלי פלט יוצא עם קוד 1 ומדפיס ל-stderr — זו הדרך התקינה לקרוא ממנו */
let probe = ""
try {
  probe = execFileSync(FF, ["-i", "scratchpad/narr-badr.mp3"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
} catch (e) {
  probe = String(e.stderr ?? "")
}
const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe)
const TOTAL = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 189
const LEAD = 0.4

const chars = lines.map((l) => l.length)
const sum = chars.reduce((a, b) => a + b, 0)
let at = LEAD
const cues = lines.map((text, i) => {
  const dur = ((TOTAL - LEAD) * chars[i]) / sum
  const row = [Number(at.toFixed(2)), Number((at + dur).toFixed(2)), text]
  at += dur
  return row
})

const clock = (s) => `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(3).padStart(6, '0')}`
fs.writeFileSync(
  'public/assets/chapter4/badr-battle.vtt',
  'WEBVTT\n\n' + cues.map(([a, b, x], i) => `${i + 1}\n${clock(a)} --> ${clock(b)}\n${x}\n`).join('\n'),
  'utf8',
)
fs.writeFileSync(
  'src/lib/chapter4/film-cues.ts',
  `/* Subtitles for the Badr film — the whole of section 03 carried by one
   continuous historical film (badr-battle.mp4, ${TOTAL.toFixed(1)}s).

   EVERY LINE IS THE SOURCE'S. The section's sixteen fragments are split at
   their own comma and full-stop boundaries and nowhere else, and the builder
   in scratchpad/cues-badr.mjs refuses to write this file unless the pieces of
   each §N join back into its exact sentence — so no word can fall between two
   subtitles and none can be quietly reworded.

   Timings are proportional to line length across the narration. The narrator's
   pace is even enough for that, and it survives a re-recorded take.

   [start seconds, end seconds, text] */

export const FILM_CUES: Array<[number, number, string]> = [
${cues.map(([a, b, x]) => `  [${a}, ${b}, ${JSON.stringify(x)}],`).join('\n')}
]
`,
  'utf8',
)
console.log(`${cues.length} כתוביות · ${TOTAL.toFixed(1)} שניות · ${refs.length} קטעי מקור`)
