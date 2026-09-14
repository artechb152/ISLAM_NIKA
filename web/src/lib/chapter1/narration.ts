/* ── קריינות סרט הסיכום ────────────────────────────────────────────────
   הופקה ב-Higgsfield CLI (text2speech_v2, variant elevenlabs, קול Arthur)
   מתוך `ch1-summary.he.vtt`, בלי לשנות מילה. הטבלה כאן היא *מתי* כל קטע
   נכנס, ותו לא — הטקסט עצמו חי בכתוביות.

   למה עשרה קטעים ולא שמונה-עשר: קריינות עברית רצה בכ-10 תווים לשנייה,
   והכתוביות נחתכו לקצב קריאה של כ-20. הקראה מלאה של התסריט נמדדה
   149.9 שניות מול סרט של 89. נבחרה (בהכרעת הבעלים) גרסת האיזון —
   עמוד השדרה ושתי הדתות. הכתוביות המלאות נשארות על המסך, ולכן שום
   תוכן לא נעלם מן הלומד; הוא רק לא נאמר בקול.

   נוצר מ-concept/chapter1/NARRATION-ch1-plan.json. */

export interface NarrationCue {
  /** מספר הכתובית במקור */
  n: number
  /** שנייה בסרט שבה הקטע מתחיל */
  at: number
  src: string
}

export const CH1_SUMMARY_NARRATION: NarrationCue[] = [
  {
    n: 1,
    at: 0.0,
    src: "/assets/anim-video/narration/01.mp3"
  },
  {
    n: 5,
    at: 10.8,
    src: "/assets/anim-video/narration/05.mp3"
  },
  {
    n: 6,
    at: 22.22,
    src: "/assets/anim-video/narration/06.mp3"
  },
  {
    n: 9,
    at: 33.73,
    src: "/assets/anim-video/narration/09.mp3"
  },
  {
    n: 10,
    at: 39.03,
    src: "/assets/anim-video/narration/10.mp3"
  },
  {
    n: 11,
    at: 48.05,
    src: "/assets/anim-video/narration/11.mp3"
  },
  {
    n: 13,
    at: 59.34,
    src: "/assets/anim-video/narration/13.mp3"
  },
  {
    n: 15,
    at: 67.86,
    src: "/assets/anim-video/narration/15.mp3"
  },
  {
    n: 17,
    at: 79.46,
    src: "/assets/anim-video/narration/17.mp3"
  },
  {
    n: 18,
    at: 84.51,
    src: "/assets/anim-video/narration/18.mp3"
  }
]
