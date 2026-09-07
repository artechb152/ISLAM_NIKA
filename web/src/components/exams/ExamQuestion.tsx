'use client'

/* שאלה אחת במבחן, בשני מצבים: מענה וסקירה.

   רכיב אחד לשני המצבים, ולא שניים — שאלה בסקירה חייבת להיראות כמו אותה שאלה
   שנענתה, אחרת הלומדת מחפשת את מה שסימנה. מה שמשתנה הוא שהכפתורים ננעלים,
   שהתשובה הנכונה מסומנת, ושנפתחת שורת המקור.

   השפה הגרפית היא של פרק 6: אין מיכל סביב שאלה, בחירה היא מילוי מרון על קרם,
   ומשבצת היא קו ולא קופסה. */

import type { BankQuestion } from '@/lib/exams/types'
import { isRight, type Answer, type SelfGrade } from '@/lib/exams'

export interface QProps {
  q: BankQuestion
  chapter: number
  /** מספרה הסידורי במבחן */
  n: number
  ans: Answer | undefined
  onAnswer: (a: Answer) => void
  mode: 'answer' | 'review'
  grade?: SelfGrade
  onGrade?: (g: SelfGrade) => void
  /** ההחזקה המשותפת לשאלות ההתאמה — מוחזקת למעלה כדי ששאלה אחת בלבד תחזיק תווית */
  held: string | null
  setHeld: (s: string | null) => void
}

const GRADE_LABEL: Record<SelfGrade, string> = {
  full: 'עניתי',
  partial: 'עניתי חלקית',
  miss: 'פספסתי',
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5 10 17.5 19 7.5" />
    </svg>
  )
}
function Cross() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/* ---------------------------------------------------------------- אמריקאית ---- */

function Choice({ q, ans, onAnswer, mode }: Pick<QProps, 'q' | 'ans' | 'onAnswer' | 'mode'>) {
  if (q.type !== 'single' && q.type !== 'multi') return null
  const picked = new Set(Array.isArray(ans) ? ans : [])
  const multi = q.type === 'multi'
  const locked = mode === 'review'

  function toggle(text: string) {
    if (locked) return
    const next = multi
      ? picked.has(text)
        ? [...picked].filter((x) => x !== text)
        : [...picked, text]
      : [text]
    onAnswer(next)
  }

  return (
    <>
      <ul className="xq-options">
        {q.options.map((o) => {
          const on = picked.has(o.text)
          /* בסקירה: התשובה הנכונה מסומנת תמיד, וטעות שנבחרה מסומנת ככזו.
             אופציה שלא נבחרה ואינה נכונה נשארת כפי שהיא — דף שכולו מסומן
             אינו קריא. */
          const cls =
            'xq-opt' +
            (on ? ' is-picked' : '') +
            (locked && o.right ? ' is-right' : '') +
            (locked && on && !o.right ? ' is-wrong' : '')
          return (
            <li key={o.text}>
              <button type="button" className={cls} aria-pressed={on} disabled={locked} onClick={() => toggle(o.text)}>
                {locked && (o.right || on) && (
                  <span className="xq-opt-mark" aria-hidden="true">{o.right ? <Tick /> : <Cross />}</span>
                )}
                <span>{o.text}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {multi && mode === 'answer' && <p className="xq-ask">אפשר לסמן יותר מאחת.</p>}
    </>
  )
}

/* ------------------------------------------------------------------ התאמה ---- */

/* סדר הבנק: ערבוב דטרמיניסטי לפי מזהה השאלה, כך שאותה לומדת מקבלת את אותו
   סדר בכל טעינה — אבל התשובות אינן יורדות בסדר שבו הן מופיעות בשורות, שהיה
   נותן את התשובה בלי לדעת דבר.

   לא useMemo, ובכוונה: `Match` מחזיר null כשהשאלה אינה מסוג התאמה, ו-hook אחרי
   return מותנה שובר את כללי ה-hooks. המערך הוא שניים עד שבעה פריטים, והחישוב
   מחדש בכל רנדר זול מכל תרגיל שיעקוף את זה. */
function orderBank(id: string, answers: string[]): string[] {
  const key = (t: string): number => {
    let h = 0
    const s = id + '|' + t
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
    return h
  }
  return [...answers].sort((a, b) => key(a) - key(b))
}

function Match({ q, ans, onAnswer, mode, held, setHeld }: Pick<QProps, 'q' | 'ans' | 'onAnswer' | 'mode' | 'held' | 'setHeld'>) {
  if (q.type !== 'match') return null
  const chosen = (ans && !Array.isArray(ans) && typeof ans !== 'string' ? ans : {}) as Record<string, string>
  const locked = mode === 'review'
  const placed = new Set(Object.values(chosen))

  const bank = orderBank(q.id, q.pairs.map((p) => p.right))

  function place(left: string) {
    if (locked) return
    const next = { ...chosen }
    if (next[left]) {
      delete next[left]
      onAnswer(next)
      return
    }
    if (!held) return
    for (const k of Object.keys(next)) if (next[k] === held) delete next[k]
    next[left] = held
    setHeld(null)
    onAnswer(next)
  }

  return (
    <>
      {!locked && (
        <ul className="xq-bank" aria-label="התשובות">
          {bank.map((a) => (
            <li key={a}>
              <button
                type="button"
                className={'xq-chip' + (held === a ? ' is-held' : '') + (placed.has(a) ? ' is-placed' : '')}
                aria-pressed={held === a}
                disabled={placed.has(a)}
                onClick={() => setHeld(held === a ? null : a)}
              >
                {a}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ul className="xq-match">
        {q.pairs.map((p) => {
          const got = chosen[p.left]
          const ok = got === p.right
          return (
            <li className="xq-match-row" key={p.left}>
              <span className={'xq-n is-blank' + (got ? ' is-full' : '')} aria-hidden="true" />
              <span className="xq-match-left">{p.left}</span>
              {locked ? (
                <span className={'xq-slot is-full' + (ok ? ' is-right' : ' is-wrong')}>
                  <span className="xq-slot-mark" aria-hidden="true">{ok ? <Tick /> : <Cross />}</span>
                  {got ?? <i>לא נענה</i>}
                  {!ok && <em className="xq-fix">{p.right}</em>}
                </span>
              ) : (
                <button
                  type="button"
                  className={'xq-slot' + (got ? ' is-full' : '')}
                  onClick={() => place(p.left)}
                  aria-label={got ? `${p.left}: ${got} — לחצו כדי להחזיר` : `${p.left}: בחרו תשובה`}
                >
                  {got ?? ''}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/* ------------------------------------------------------------------ פתוחה ---- */

function Open({ q, ans, onAnswer, mode, grade, onGrade }: Pick<QProps, 'q' | 'ans' | 'onAnswer' | 'mode' | 'grade' | 'onGrade'>) {
  if (q.type !== 'open') return null
  const text = typeof ans === 'string' ? ans : ''

  if (mode === 'answer') {
    return (
      <textarea
        className="xq-write"
        rows={5}
        value={text}
        placeholder="כתבו כאן את תשובתכם"
        onChange={(e) => onAnswer(e.target.value)}
      />
    )
  }

  /* בסקירה: מה שנכתב, ואז תשובת המופת עם נקודות המפתח, ואז ההערכה העצמית.
     הסדר הזה הוא הבדיקה עצמה — קודם מה שזכרת, אחר כך מה שהיה צריך, ורק אז
     ההכרעה. מי שרואה קודם את התשובה אינו יכול עוד לשפוט את עצמו. */
  return (
    <>
      <div className="xq-mine">
        <span className="xq-label">התשובה שכתבתם</span>
        {text.trim() ? <p>{text}</p> : <p className="xq-empty">נשארה ריקה.</p>}
      </div>
      <div className="xq-model">
        <span className="xq-label">תשובת המופת</span>
        <p>{q.model}</p>
        <span className="xq-label">נקודות המפתח</span>
        <ul className="xq-points">
          {q.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="xq-grade" role="group" aria-label="הערכה עצמית">
        <span className="xq-label">כמה מנקודות המפתח כיסיתם?</span>
        <div className="xq-grade-row">
          {(['full', 'partial', 'miss'] as SelfGrade[]).map((g) => (
            <button
              key={g}
              type="button"
              className={'xq-pick' + (grade === g ? ' is-on' : '')}
              aria-pressed={grade === g}
              onClick={() => onGrade?.(g)}
            >
              {GRADE_LABEL[g]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ השאלה ---- */

export default function ExamQuestion(p: QProps) {
  const { q, chapter, n, mode } = p
  const answered =
    q.type === 'open'
      ? typeof p.ans === 'string' && p.ans.trim().length > 0
      : q.type === 'match'
        ? p.ans !== undefined && Object.keys(p.ans as Record<string, string>).length === q.pairs.length
        : Array.isArray(p.ans) && p.ans.length > 0

  const right = mode === 'review' && q.type !== 'open' ? isRight(q, p.ans) : undefined

  return (
    <section
      className={
        'xq' +
        (mode === 'review' ? ' is-review' : '') +
        (right === true ? ' is-right' : right === false ? ' is-wrong' : '') +
        (mode === 'answer' && answered ? ' is-answered' : '')
      }
      id={`xq-${q.id}`}
      aria-labelledby={`xq-${q.id}-t`}
    >
      <header className="xq-head">
        <span className={'xq-n' + (mode === 'answer' && answered ? ' is-full' : '') + (right === true ? ' is-full' : '')} aria-hidden="true">
          {n}
        </span>
        <div>
          <p className="xq-meta">
            פרק {chapter}
            {q.type === 'open' && <span className="xq-tag">שאלה פתוחה</span>}
            {mode === 'review' && right === true && <span className="xq-tag is-right">נכון</span>}
            {mode === 'review' && right === false && <span className="xq-tag is-wrong">שגוי</span>}
          </p>
          <h2 id={`xq-${q.id}-t`}>{q.prompt}</h2>
        </div>
      </header>

      <div className="xq-work">
        <Choice q={q} ans={p.ans} onAnswer={p.onAnswer} mode={mode} />
        <Match q={q} ans={p.ans} onAnswer={p.onAnswer} mode={mode} held={p.held} setHeld={p.setHeld} />
        <Open q={q} ans={p.ans} onAnswer={p.onAnswer} mode={mode} grade={p.grade} onGrade={p.onGrade} />
      </div>

      {/* שורת המקור נפתחת רק בסקירה. במהלך המבחן היא הייתה רומזת על התשובה,
          ואחריו היא הדבר היחיד שמאפשר לחזור לפסקה שממנה השאלה באה. */}
      {mode === 'review' && (
        <footer className="xq-foot">
          <p className="xq-ok">{q.ok}</p>
          <p className="xq-src">
            <span>{q.sources}</span>
            <a href={`/chapter${chapter}`}>לפרק {chapter}</a>
          </p>
        </footer>
      )}
    </section>
  )
}
