'use client'

/* The one thing each region asks you to work out.
 *
 * Nothing here fails. Choosing wrong plays the note attached to that choice —
 * which is a real explanation, not a buzzer — and leaves the question open, so
 * the cost of being wrong is that somebody tells you something you did not
 * know. Multi-answer tasks (the caravan crate) keep going until every right
 * answer is in, and the wrong one is left deliberately reachable because its
 * note is the lesson: some things travelled that nobody could pack. */

import { useState } from 'react'
import type { Task } from '@/lib/chapter1/tasks'

export function TaskPanel({ task, onSolved, onClose }: {
  task: Task
  onSolved: () => void
  onClose: () => void
}) {
  const needed = task.options.filter((o) => o.right).map((o) => o.id)
  const [chosen, setChosen] = useState<string[]>([])
  const [note, setNote] = useState<{ text: string; right: boolean } | null>(null)
  const [solved, setSolved] = useState(false)

  const choose = (id: string) => {
    const opt = task.options.find((o) => o.id === id)
    if (!opt || solved) return
    setNote({ text: opt.note, right: !!opt.right })
    if (!opt.right) return
    const next = chosen.includes(id) ? chosen : [...chosen, id]
    setChosen(next)
    if (needed.every((n) => next.includes(n))) {
      setSolved(true)
      onSolved()
    }
  }

  return (
    <div className="ch1-task" role="dialog" aria-labelledby="ch1-task-title">
      <div className="ch1-task-card">
        <p className="ch1-task-eyebrow">
          {task.asker} · <span>{task.source}</span>
        </p>
        <h3 id="ch1-task-title">{task.title}</h3>
        <p className="ch1-task-question">{task.question}</p>

        <div className="ch1-task-options">
          {task.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`hud-card-btn${chosen.includes(o.id) ? ' is-taken' : ''}`}
              disabled={chosen.includes(o.id) || solved}
              onClick={() => choose(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {note && (
          <p className={`ch1-task-note${note.right ? ' is-right' : ''}`} role="status" aria-live="polite">
            {note.text}
          </p>
        )}

        <div className="ch1-task-foot">
          {solved ? (
            <>
              <span className="ch1-task-done">{task.done}</span>
              <button type="button" className="hud-card-btn is-primary" onClick={onClose} autoFocus>
                הלאה
              </button>
            </>
          ) : (
            <>
              {needed.length > 1 && (
                <span className="ch1-task-progress">
                  {chosen.length} מתוך {needed.length}
                </span>
              )}
              <button type="button" className="hud-card-btn" onClick={onClose}>
                אחר כך
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
