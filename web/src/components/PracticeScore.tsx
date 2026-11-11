'use client'
/* הציון של התרגול המסכם (המשתמשת, 9.11.2026: „תוסיף לכל תרגול מסיים ציונים").

   התרגול מאפשר לנסות שוב עד שנכון, ולכן הציון מודד את מה שהוא יכול למדוד: כמה שאלות נענו
   נכון **בניסיון הראשון**. זה כבר נשמר — `missed` בחנות של כל תרגול הוא השאלות שלקחו ניסיון
   שגוי בדרך — כך שהציון נגזר מהחנות ואינו מצב נוסף שיכול להתפזר: ללא אחסון חדש, ובלי
   לשנות את מה שהתרגול כותב. הוא נשמר גם ב-`islam:score:N` (אחוז), כדי שמסך הפרקים יוכל להראות
   אותו, וגם נקרא מחדש כשחוזרים לתרגול שכבר הושלם.

   השאלות שדרשו ניסיון נוסף מופיעות כקישורים אל השאלה עצמה — „לחזרה".

   ⚠ הלומד יודע מראש שיש ציון (המשתמשת, 11.11.2026). עד אז כל פתיח אמר „אין ניקוד ואין
   כישלון" — ובסוף הופיע ציון. `PracticeLead` הוא הפתיח היחיד של כל התרגולים, כולל פרק 6,
   ומילה אחת לאורך כל האתר: „ציון", אף פעם לא „ניקוד". */
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

/* המספר בפתיח נגזר ממספר השאלות (כלל 32) — ובמילים, כמו בכל משפט באתר */
const COUNT_WORDS: Record<number, string> = {
  2: 'שתי', 3: 'שלוש', 4: 'ארבע', 5: 'חמש', 6: 'שש', 7: 'שבע', 8: 'שמונה', 9: 'תשע', 10: 'עשר',
  11: 'אחת-עשרה', 12: 'שתים-עשרה', 13: 'שלוש-עשרה', 14: 'ארבע-עשרה', 15: 'חמש-עשרה',
}
export const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n)

/** הפתיח של כל תרגול מסכם: כמה שאלות, ושבסוף יש ציון ועל מה הוא נספר */
export function PracticeLead({ title, count }: { title: string; count: number }) {
  return (
    <p className="pscore-lead" data-reveal>
      {title} — {countWord(count)} שאלות.{' '}
      <span className="pscore-lead-key">
        בסוף התרגול מקבלים ציון: הוא סופר את השאלות שנענו נכון בניסיון הראשון.
      </span>{' '}
      אחרי טעות אפשר לנסות שוב, עד שהתשובה נכונה.
    </p>
  )
}

export default function PracticeScore({
  chapter,
  questions,
  missed,
  idPrefix = 'p2-',
}: {
  chapter: number
  /** `href` כשהעוגן של השאלה אינו `#${idPrefix}${id}` (פרק 6: שתי שאלות חולקות מקטע אחד) */
  questions: { id: string; label: string; href?: string }[]
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
            <a key={q.id} href={q.href ?? `#${idPrefix}${q.id}`}>
              {q.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
