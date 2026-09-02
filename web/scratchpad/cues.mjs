import fs from 'node:fs'

/* הכתוביות הן פיצול של שני משפטי §12 לפסוקיות. כל שורה חייבת להיות רצף
   מדויק מהמקור — הסקריפט נופל אם לא, ובודק גם שהשרשור חזרה נותן בדיוק את
   המשפט המקורי, כדי שאף מילה לא תיפול בין השורות. */
const d = JSON.parse(fs.readFileSync('src/lib/chapter4/passages.json', 'utf8'))
const t = (ref) => { const [s, i] = ref.split('.'); return d.passages[s].find((f) => f.id === i).text }

const SPLIT = {
  '§12.rain': [
    'המסורת אומרת כי בלילה שלפני הקרב',
    "ניתך גשם עז על צבאו של אבו ג'הל שהיה בעמק בדר,",
    'ושיבש לו את היכולת לנווט לעבר צבאו של מוחמד.',
  ],
  '§12.duel': [
    'לאחר דו-קרב (מנהג נפוץ במלחמות באותם הימים)',
    'בין שלושה אנשי צבא בכירים מצבאו של מוחמד',
    'לבין שלושה בכירים מצבא הכופרים,',
    'פשטו אנשי מוחמד על הכופרים',
    'והצליחו להרוג שבעים מהם ולשבות מספר דומה של כופרים,',
    'לעומת צבא מוחמד שאיבד מספר קטן של לוחמים.',
  ],
}

const lines = []
for (const [ref, parts] of Object.entries(SPLIT)) {
  const whole = t(ref)
  if (parts.join(' ') !== whole) {
    throw new Error(`הפיצול של ${ref} אינו מרכיב בחזרה את המשפט:\n${parts.join(' ')}\n${whole}`)
  }
  lines.push(...parts)
}

/* התזמון פרופורציוני לאורך התווים על פני אורך הקריינות. הקצב של הקריין
   אחיד דיו, וקו האורך הוא הקירוב הישר ביותר שלא דורש ניתוח אודיו. */
const TOTAL = 33.6
const LEAD = 0.35
const chars = lines.map((l) => l.length)
const sum = chars.reduce((a, b) => a + b, 0)
let at = LEAD
const cues = lines.map((text, i) => {
  const dur = ((TOTAL - LEAD) * chars[i]) / sum
  const row = [Number(at.toFixed(2)), Number((at + dur).toFixed(2)), text]
  at += dur
  return row
})

const clock = (s) => {
  const m = Math.floor(s / 60)
  const r = (s % 60).toFixed(3).padStart(6, '0')
  return `00:${String(m).padStart(2, '0')}:${r}`
}
fs.writeFileSync(
  'public/assets/chapter4/badr-battle.vtt',
  'WEBVTT\n\n' + cues.map(([a, b, x], i) => `${i + 1}\n${clock(a)} --> ${clock(b)}\n${x}\n`).join('\n'),
  'utf8',
)

fs.writeFileSync(
  'src/lib/chapter4/film-cues.ts',
  `/* Subtitles for the Badr film (badr-battle.mp4, 33.6s).

   EVERY LINE IS THE SOURCE'S. The two sentences of §12 are split at their own
   clause boundaries and nothing else; scripts/… no — the check lives in
   scratchpad/cues.mjs and it refuses to write this file unless the pieces join
   back into the exact sentence, so no word can fall between two subtitles.

   Timings are proportional to line length across the narration. The narrator's
   pace is even enough for that, and it needs no audio analysis to stay true
   when the take is replaced — regenerate and the split still holds.

   [start seconds, end seconds, text] */

export const FILM_CUES: Array<[number, number, string]> = [
${cues.map(([a, b, x]) => `  [${a}, ${b}, ${JSON.stringify(x)}],`).join('\n')}
]
`,
  'utf8',
)
console.log(`נכתבו ${cues.length} כתוביות · ${cues[0][0]}s → ${cues[cues.length - 1][1]}s`)
