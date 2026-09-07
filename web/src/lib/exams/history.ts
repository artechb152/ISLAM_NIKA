/* היסטוריית המבחנים.

   הכל נשמר בדפדפן של המשתמשת בלבד — localStorage, אותו מקום שבו שמורות
   התקדמות הפרקים והמחברת. אין שרת, ולכן אין לאן לשלוח את זה גם אם היינו רוצים.

   מה שנשמר הוא מזהי השאלות והתשובות, ולא השאלות עצמן. שתי סיבות:
   הרשומה נשארת קטנה (מבחן של 60 שאלות הוא כמה קילובייטים ולא כמה מאות),
   וסקירה של מבחן ישן נבנית תמיד מהמאגר הנוכחי — כך שתיקון ניסוח בשאלה
   מופיע גם בסקירות הישנות, במקום להשאיר עותק שקפא. */

import { QUESTION_BY_ID, type Answer, type SelfGrade } from './index'

const KEY = 'islam:exams:history'
/** התראה בתוך אותו טאב — `storage` נורה רק בטאבים אחרים */
export const HISTORY_EVENT = 'islam:exams:history-changed'
/** תקרה. מבחן ממוצע הוא כמה קילובייטים, וחמישים כאלה נשארים הרבה מתחת למכסה. */
const MAX = 50

export interface AttemptItem {
  qid: string
  /** התשובה שניתנה; undefined אם נשארה ריקה */
  ans?: Answer
  /** רק לשאלה פתוחה */
  grade?: SelfGrade
}

export interface Attempt {
  id: string
  /** epoch ms */
  at: number
  chapters: number[]
  seed: number
  timed: boolean
  /** משך המבחן בפועל, במילישניות */
  elapsedMs: number
  items: AttemptItem[]
}

function safeRead(): Attempt[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    /* שורה שהמאגר כבר אינו מכיר את שאלותיה אינה נזרקת — היא פשוט תציג פחות
       בסקירה. זריקת מבחן שלם בגלל שאלה אחת שנמחקה היא אובדן נתונים. */
    return parsed.filter(
      (a): a is Attempt =>
        !!a && typeof a === 'object' && typeof (a as Attempt).id === 'string' && Array.isArray((a as Attempt).items)
    )
  } catch {
    return []
  }
}

export function readHistory(): Attempt[] {
  const all = safeRead()
  return [...all].sort((a, b) => b.at - a.at)
}

function write(list: Attempt[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* מכסת האחסון מלאה, או חלון פרטי שחוסם. המבחן על המסך ממשיך לעבוד —
       רק לא יישמר, וזה עדיף על נפילה. */
  }
  window.dispatchEvent(new Event(HISTORY_EVENT))
}

/** שומר מבחן, או מעדכן אותו אם כבר נשמר — ההערכה העצמית של שאלה פתוחה
 *  נעשית אחרי ההגשה, ולכן אותו מבחן נשמר יותר מפעם אחת. */
export function saveAttempt(a: Attempt): void {
  const list = safeRead().filter((x) => x.id !== a.id)
  write([a, ...list])
}

export function deleteAttempt(id: string): void {
  write(safeRead().filter((x) => x.id !== id))
}

export function clearHistory(): void {
  write([])
}

/** האם עדיין אפשר להציג את המבחן הזה — כלומר האם המאגר עוד מכיר את שאלותיו */
export function knownItems(a: Attempt): AttemptItem[] {
  return a.items.filter((i) => QUESTION_BY_ID.has(i.qid))
}

export function newId(): string {
  return 'ex-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}
