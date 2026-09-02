/* Subtitles for the Badr film (badr-battle.mp4, 33.6s).

   EVERY LINE IS THE SOURCE'S. The two sentences of §12 are split at their own
   clause boundaries and nothing else; scripts/… no — the check lives in
   scratchpad/cues.mjs and it refuses to write this file unless the pieces join
   back into the exact sentence, so no word can fall between two subtitles.

   Timings are proportional to line length across the narration. The narrator's
   pace is even enough for that, and it needs no audio analysis to stay true
   when the take is replaced — regenerate and the split still holds.

   [start seconds, end seconds, text] */

export const FILM_CUES: Array<[number, number, string]> = [
  [0.35, 3.36, "המסורת אומרת כי בלילה שלפני הקרב"],
  [3.36, 7.68, "ניתך גשם עז על צבאו של אבו ג'הל שהיה בעמק בדר,"],
  [7.68, 11.81, "ושיבש לו את היכולת לנווט לעבר צבאו של מוחמד."],
  [11.81, 15.85, "לאחר דו-קרב (מנהג נפוץ במלחמות באותם הימים)"],
  [15.85, 19.6, "בין שלושה אנשי צבא בכירים מצבאו של מוחמד"],
  [19.6, 22.52, "לבין שלושה בכירים מצבא הכופרים,"],
  [22.52, 24.96, "פשטו אנשי מוחמד על הכופרים"],
  [24.96, 29.75, "והצליחו להרוג שבעים מהם ולשבות מספר דומה של כופרים,"],
  [29.75, 33.6, "לעומת צבא מוחמד שאיבד מספר קטן של לוחמים."],
]
