'use client'

/* ── חמש חוליות, תשובה אחת ────────────────────────────────────────────────
 *
 * הדבר האחרון שהפרק מבקש, והראשון שהוא שאל: §0 פותח ב„כדי להבין… איך רעיון
 * המונותאיזם עלה בדעתו של מוחמד", והתשובה פרושה בחוברת על פני חמישה נושאים.
 * עד עכשיו הם נאמרו בחמש תחנות ואיש לא חיבר ביניהם — הלומד שמע חמישה
 * סיפורים ולא תשובה.
 *
 * כאן הוא מרכיב אותה: חמש החוליות נכנסות לשלושת חלקי המשפט של §9 — מאין
 * באו הרעיונות, לאן חלחלו, ומי מצפון השפיע בלי להשליט — ואז נבחרת המסקנה.
 * רק אחריה נאמר §48, שהיה עד כה הסתייגות בסוף מונולוג.
 *
 * הדליים אינם קטגוריות שהומצאו כאן: הם המשפט של הסעיף. כל מחרוזת בעמוד
 * הזה מגיעה מ-tasks.ts ומ-dialogue.json, שנבדקים בשערי הנאמנות — הקומפוננטה
 * אינה כותבת משפט.
 *
 * ⚠ למה כאן ולא בעולם התלת-ממד: אזור הסיום אינו עולם. השער האחרון במכה
 * מנווט אל `?region=exit`, ו-Chapter1Client מפנה משם אל הדף הזה (החלטת
 * המשתמשת: דף במעטפת האתר, לא מסך כהה שלישי). משימה שהייתה יושבת בעולם
 * ההוא לא הייתה נפתחת לעולם.
 *
 * שני קליקים, לא גרירה — כמו בכל מיון בפרק: מרימים דבר, ואז אומרים לאן.
 * זה מה שמשאיר את המקלדת וקורא-המסך בפנים. */

import { useState } from 'react'
import type { Task } from '@/lib/chapter1/tasks'

export function ExitAssembly({ task, solved, onSolved }: {
  task: Task
  solved: boolean
  onSolved: () => void
}) {
  const [placed, setPlaced] = useState<string[]>(solved ? task.options.map((o) => o.id) : [])
  const [held, setHeld] = useState<string | null>(null)
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null)
  const [answer, setAnswer] = useState<string | null>(null)

  const bins = task.bins ?? []
  const allPlaced = task.options.every((o) => placed.includes(o.id))
  const interpret = task.interpret
  const right = interpret?.options.find((o) => o.right)
  const done = solved || (!!answer && answer === right?.id)

  const drop = (binId: string) => {
    if (!held) return
    const opt = task.options.find((o) => o.id === held)
    if (!opt) return
    const ok = opt.bin === binId
    setNote({ text: ok ? opt.note : (opt.wrong ?? opt.note), ok })
    if (ok) setPlaced((p) => (p.includes(opt.id) ? p : [...p, opt.id]))
    setHeld(null)
  }

  const answerIt = (id: string) => {
    const opt = interpret?.options.find((o) => o.id === id)
    if (!opt) return
    setAnswer(id)
    setNote({ text: opt.note, ok: !!opt.right })
    if (opt.right) onSolved()
  }

  return (
    <div className="p1-assembly">
      {!done && (
        <p className="p1-assembly-q">{allPlaced && interpret ? interpret.question : task.question}</p>
      )}

      {!allPlaced && (
        <>
          <div className="p1-assembly-tray" role="group" aria-label="החוליות שנאספו בדרך">
            {task.options.map((o) => {
              const taken = placed.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`hud-card-btn ch1-sort-item${taken ? ' is-taken' : ''}${held === o.id ? ' is-held' : ''}`}
                  disabled={taken}
                  aria-pressed={held === o.id}
                  onClick={() => setHeld(held === o.id ? null : o.id)}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
          <div className="p1-assembly-bins">
            {bins.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`ch1-sort-bin${held ? ' is-live' : ''}`}
                disabled={!held}
                onClick={() => drop(b.id)}
              >
                <span className="ch1-sort-bin-label">{b.label}</span>
                <span className="ch1-sort-bin-has">
                  {task.options.filter((o) => placed.includes(o.id) && o.bin === b.id).map((o) => o.label).join(' · ') || '—'}
                </span>
              </button>
            ))}
          </div>
          {!held && <p className="p1-assembly-hint">בחרו חוליה, ואז את מקומה במשפט.</p>}
        </>
      )}

      {allPlaced && !done && interpret && (
        <div className="p1-assembly-answers">
          {interpret.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`hud-card-btn${answer === o.id ? ' is-last' : ''}`}
              onClick={() => answerIt(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {note && !done && (
        <p className={`p1-assembly-note${note.ok ? ' is-right' : ''}`} role="status" aria-live="polite">
          {note.text}
        </p>
      )}

      {done && <p className="p1-assembly-done">{task.done}</p>}
    </div>
  )
}
