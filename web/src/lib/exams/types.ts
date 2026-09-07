/* חדר המבחנים — הסכימה של מאגר השאלות.

   מאגר אחד לכל פרק, ב-`banks/chN.json`. המאגרים הם נתונים בלבד: אין בהם
   רכיב, אין בהם עיצוב, ואין בהם שום דבר שתלוי באיך המבחן נראה. זה מכוון —
   התרגולים של פרקים 2, 3 ו-6 כל אחד המציא לעצמו מבנה שאלה משלו, ושלושתם
   נעולים בתוך הפרק שלהם. השאלות כאן שייכות לחדר המבחנים, לא לפרק.

   שני הכללים של התרגולים הקיימים תקפים כאן מילה במילה:

     1. לא שואלים מה שהעמוד עונה עליו בעצם ההדפסה. מונח שמודפס ליד הגלוסה
        שלו אינו שאלה.
     2. אף תשובה — נכונה או מסיחה — אינה ממציאה עובדה שהמקור אינו נושא.
        `sources` הוא הקישור הזה, וכל שאלה חייבת לשאת אותו.

   ההסתייגויות של המקור נשמרות כלשונן. §1 אומר שהמידע דל ושיש לקחת את
   המסורת המוסלמית ב"עירבון מוגבל", §39 אומר ש"חוקרים גורסים", §17 אומר
   "לא מן הנמנע" — שאלה שנשענת על סעיף כזה חייבת לשמור על ההסתייגות בניסוח
   שלה ובתשובה שלה. הפיכת "חוקרים גורסים" ל"כך היה" היא בדיוק ההמצאה שכלל 2
   אוסר. */

/** 1 בסיס · 2 בינוני · 3 מאתגר.
 *
 *  פנימי בלבד — הלומדת לא בוחרת רמה ולא רואה אותה. הוא קיים כדי שההגרלה
 *  תוכל לאזן: מבחן שכולו שאלות שֵם-ותאריך אינו מודד הבנה, ומבחן שכולו
 *  שאלות פרשנות אינו הוגן. הצגתו למשתמשת נשארת פתוחה לעתיד בלי שהמאגר
 *  יצטרך להיכתב מחדש. */
export type Difficulty = 1 | 2 | 3

export type ClosedKind = 'single' | 'multi' | 'match'
export type QuestionKind = ClosedKind | 'open'

interface Base {
  /** `ch1-q07` — הפרק בתוך המזהה, כך ששאלה שנשלפה מהערבוביה יודעת מאיפה באה */
  id: string
  /** ה-§§ מ-SOURCE-TEXT.md שהשאלה נשענת עליהם. מוצג בסקירה שאחרי המבחן. */
  sources: string
  difficulty: Difficulty
  prompt: string
  /** המשפט שנאמר בסקירה. מלמד, ולא מברך — כמו ה-`ok` של התרגולים. */
  ok: string
}

/** אמריקאית: תשובה אחת נכונה */
export interface SingleQ extends Base {
  type: 'single'
  options: { text: string; right: boolean }[]
}

/** רב-בחירה: יותר מתשובה אחת נכונה. הניסוח אומר את זה במפורש. */
export interface MultiQ extends Base {
  type: 'multi'
  options: { text: string; right: boolean }[]
}

/** התאמה: כל `left` והתשובה שלו. הבנק שהלומדת בוחרת ממנו הוא אוסף ה-`right`. */
export interface MatchQ extends Base {
  type: 'match'
  pairs: { left: string; right: string }[]
}

/** פתוחה.
 *
 *  האתר סטטי — אין שרת, ולכן אין בדיקה אוטומטית. הבדיקה היא הערכה עצמית:
 *  אחרי ההגשה נחשפת `model`, ו-`points` הן נקודות המפתח שהלומדת מסמנת מולן
 *  אם ענתה, ענתה חלקית, או פספסה. `points` הוא לכן חלק מהבדיקה ולא קישוט —
 *  תשובת מופת שהיא פסקה רצה בלי נקודות מונה אינה ניתנת להערכה עצמית הוגנת. */
export interface OpenQ extends Base {
  type: 'open'
  /** נקודות המפתח שתשובה מלאה נוגעת בהן. שתיים עד ארבע. */
  points: string[]
  /** תשובת המופת עצמה, בלשון המקור ככל האפשר. */
  model: string
}

export type BankQuestion = SingleQ | MultiQ | MatchQ | OpenQ
export type ClosedQuestion = SingleQ | MultiQ | MatchQ

export interface Bank {
  /** מספר הפרק, כמו ב-chapters-data */
  chapter: number
  title: string
  /** הקובץ שכל שאלה כאן נשענת עליו — כדי שאפשר יהיה לאמת אוטומטית */
  source: string
  questions: BankQuestion[]
}

export const isOpen = (q: BankQuestion): q is OpenQ => q.type === 'open'
export const isClosed = (q: BankQuestion): q is ClosedQuestion => q.type !== 'open'
