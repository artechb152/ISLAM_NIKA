/* Subtitle cues for the chapter-6 opening film (ch6-story.mp4).

   Text follows the narration script of the re-recorded video (16.8.2026, 63.4s). Timings were
   derived from the ACTUAL audio: the film's music bed never goes silent, so the spoken stretches
   were found from a speech-band energy envelope (scratchpad/segment.mjs) rather than from
   silence detection, and each line was laid over the stretch it is spoken in.

   The concept is unchanged from the first cut: one clause per cue, and every spoken quote —
   "יא מוחמד, מהו האסלאם?", "אמת אמרת", "האם אתם יודעים מי היה האיש?", "זהו המלאך גבריאל" — is
   its own cue, split from its "…ואמר:" / "…ענה לו:" / "…שאל אותם:" lead-in. Muhammad's answer
   runs across six cues, so the quotation marks open on the first and close on the last.
   [start seconds, end seconds, text] */

export const FILM_CUES: Array<[number, number, string]> = [
  [0.2, 4.3, "יש מסורת באסלאם, המיוחסת לעֻמַר בן אלח'טאב (הח'ליף השני),"],
  [4.3, 7.5, 'שמוחמד ישב עם חבריו (הצחאבה) בעיר מדינה,'],
  [7.5, 11.8, 'כשלפתע ניגש אליהם אדם עם בגדים מבהיקים ושערו שחור,'],
  [11.8, 16.4, 'ונראה שלמרות שהגיע ממרחק, סימני המסע לא ניכרו עליו.'],
  [16.4, 22.0, 'האדם ניגש למוחמד, הצמיד את ברכיו לברכיו והניח את ידיו על ירכיו.'],
  [22.6, 24.6, 'פנה האיש למוחמד ואמר:'],
  [24.9, 27.3, '"יא מוחמד, מהו האסלאם?"'],
  [27.6, 31.8, '"האסלאם הוא שעליך להאמין שאין אל מבלעדי אללה,'],
  [31.9, 33.3, 'שמוחמד הוא שליחו,'],
  [33.3, 35.1, 'עליך להתפלל חמש תפילות ביום,'],
  [35.7, 36.7, 'לתת צדקה,'],
  [36.9, 38.7, 'לצום את צום הרמדאן'],
  [38.9, 42.0, 'ולעלות לרגל פעם בחיים אם ביכולתך."'],
  [43.3, 46.4, 'לאחר מספר שאלות נוספות למוחמד, ענה לו:'],
  [46.8, 48.2, '"אמת אמרת"'],
  [49.9, 51.2, 'ונעלם.'],
  [52.7, 55.2, 'לפליאתו של עמר, שאל אותם מוחמד:'],
  [55.6, 57.5, '"האם אתם יודעים מי היה האיש?"'],
  [57.9, 59.4, 'והשיבו לו בשלילה.'],
  [59.8, 61.0, 'ענה להם מוחמד:'],
  [61.2, 63.2, '"זהו המלאך גבריאל".'],
]
