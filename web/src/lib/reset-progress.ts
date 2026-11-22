/* איפוס ההתקדמות (המשתמשת, 22.11.2026: „תעשה שיהיה אופציה לאפס התקדמות באתר").

   מה נחשב התקדמות — כל מה שהאתר כותב בדפדפן על מה שהקוראת עשתה:
     islam:chapter:N   סימון „הושלם" של פרק (נכתב רק על ידי התרגול)
     islam:score:N     הציון של התרגול (PracticeScore)
     chN:v1 / chN:v2   אילו מקטעים נקראו
     chN:practice:v1   התשובות של התרגול
     chN:…             כל מה שנשאר מגרסאות קודמות של הפרק (למשל המשחק של פרק 1)
   והשניים האישיים — לא נמחקים אלא בבקשה:
     site:notebook:v2     המחברת שלי
     islam:exams:history  היסטוריית המבחנים

   מה לא נוגעים בו, בכוונה: ההגדרות (a11y:v1, chN:side-collapsed, chapters:side-collapsed) והסיור
   שכבר נראה (chapters:tour:v1) — אלה לא התקדמות, ומי שהגדילה את הכתב לא רוצה שהוא יחזור.
   אחסון חסום או שגוי לא שובר את המסך: מחזירים כמה פריטים נמחקו. */
import { MARKS_EVENT } from '@/lib/site-notebook'

const PROGRESS = [/^islam:(chapter|score):/, /^ch\d+:(?!side-collapsed$)/]
const NOTEBOOK_KEYS = ['site:notebook:v2']
const EXAM_KEYS = ['islam:exams:history']

export function resetProgress(opts: { notebook: boolean; exams: boolean }): number {
  let removed = 0
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k) keys.push(k)
    }
    for (const k of keys) {
      const hit =
        PROGRESS.some((re) => re.test(k)) ||
        (opts.notebook && NOTEBOOK_KEYS.includes(k)) ||
        (opts.exams && EXAM_KEYS.includes(k))
      if (hit) {
        window.localStorage.removeItem(k)
        removed++
      }
    }
  } catch {
    /* דפדפן שחוסם אחסון — אין מה למחוק */
  }
  try {
    window.dispatchEvent(new CustomEvent(MARKS_EVENT))
  } catch {}
  return removed
}
