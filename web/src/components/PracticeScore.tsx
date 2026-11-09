'use client'
/* הציון של התרגול המסכם (המשתמשת, 9.11.2026: „תוסיף לכל תרגול מסיים ציונים").

   התרגול מאפשר לנסות שוב עד שנכון, ולכן הציון מודד את מה שהוא יכול למדוד: כמה שאלות נענו
   נכון **בניסיון הראשון**. זה כבר נשמר — `missed` בחנות של כל תרגול הוא השאלות שלקחו ניסיון
   שגוי בדרך — כך שהציון נגזר מהחנות ואינו מצב נוסף שיכול להתפזר: ללא אחסון חדש, ובלי
   לשנות את מה שהתרגול כותב. הוא נשמר גם ב-`islam:score:N` (אחוז), כדי שמסך הפרקים יוכל להראות
   אותו, וגם נקרא מחדש כשחוזרים לתרגול שכבר הושלם.

   השאלות שדרשו ניסיון נוסף מופיעות כקישורים אל השאלה עצמה — „לחזרה". */
import '@/styles/practice-score.css'
import { useEffect } from 'react'

export const scoreKey = (chapter: number) => `islam:score:${chapter}`

/** האחוז השמור של פרק, או null אם עוד לא הושלם תרגול */
export function readScore(chapter: number): number | null {
  try {
    const raw = window.localStorage.getItem(scoreKey(chapter))
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null
  } catch {
    return null
  }
}

export default function PracticeScore({
  chapter,
  questions,
  missed,
  idPrefix = 'p2-',
}: {
  chapter: number
  questions: { id: string; label: string }[]
  missed: string[]
  /** הקידומת של ה-id שעל כל שאלה בעמוד, ליעד של „לחזרה" */
  idPrefix?: string
}) {
  const total = questions.length
  const retried = questions.filter((q) => missed.includes(q.id))
  const first = total - retried.length
  const pct = total ? Math.round((first / total) * 100) : 0

  useEffect(() => {
    try {
      window.localStorage.setItem(scoreKey(chapter), String(pct))
    } catch {
      /* אחסון חסום — הציון עדיין מוצג */
    }
  }, [chapter, pct])

  return (
    <div className={'pscore' + (pct === 100 ? ' is-full' : '')} role="group" aria-label="ציון התרגול">
      <div className="pscore-n">
        <span className="pscore-label">ציון</span>
        <b>{pct}</b>
      </div>
      <div className="pscore-line">
        {first === total ? `כל ${total} השאלות נענו נכון בניסיון הראשון` : `${first} מתוך ${total} שאלות נענו נכון בניסיון הראשון`}
      </div>
      {retried.length > 0 && (
        <div className="pscore-review">
          <span>לחזרה:</span>
          {retried.map((q) => (
            <a key={q.id} href={`#${idPrefix}${q.id}`}>
              {q.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
