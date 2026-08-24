'use client'

/* The one thing each region asks you to work out.
 *
 * Nothing here fails. Choosing wrong plays the note attached to that choice —
 * which is a real explanation, not a buzzer — and leaves the question open, so
 * the cost of being wrong is that somebody tells you something you did not
 * know. Multi-answer tasks (the caravan crate) keep going until every right
 * answer is in, and the wrong one is left deliberately reachable because its
 * note is the lesson: some things travelled that nobody could pack.
 *
 * The state lives in Game, not here: the same question can now also be
 * answered with the hands — dragging the option's physical stand-in onto the
 * station — and both routes must share one progress. The buttons stay for
 * keyboards, screen readers and the harnesses. */

import type { Task } from '@/lib/chapter1/tasks'

export function TaskPanel({ task, chosen, last, solved, onChoose, onClose }: {
  task: Task
  /** right answers already given, by either hand or button */
  chosen: string[]
  /** the most recent choice — its note is on display */
  last: string | null
  solved: boolean
  onChoose: (id: string) => void
  onClose: () => void
}) {
  const needed = task.options.filter((o) => o.right)
  const lastOpt = last ? task.options.find((o) => o.id === last) : null

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
              onClick={() => onChoose(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {lastOpt && (
          <p className={`ch1-task-note${lastOpt.right ? ' is-right' : ''}`} role="status" aria-live="polite">
            {lastOpt.note}
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
