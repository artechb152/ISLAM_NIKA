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

import { useState } from 'react'
import type { Task } from '@/lib/chapter1/tasks'

export function TaskPanel({ task, chosen, last, lastOk, solved, onChoose, onSort, onClose }: {
  task: Task
  /** right answers already given, by either hand or button */
  chosen: string[]
  /** the most recent choice — its note is on display */
  last: string | null
  /** whether that choice was the right one; a sort task's misses teach too */
  lastOk: boolean
  solved: boolean
  onChoose: (id: string) => void
  /** sort tasks: an item was put on one side */
  onSort: (itemId: string, binId: string) => void
  onClose: () => void
}) {
  const sorting = task.kind === 'sort'
  const needed = sorting ? task.options : task.options.filter((o) => o.right)
  const lastOpt = last ? task.options.find((o) => o.id === last) : null
  /* Two clicks, not a drag: pick the thing up, then say which side it goes on.
     A pointer drag would shut out the keyboard and the screen reader, and this
     panel is the accessible route by design — the hands-on route is the props
     standing out by the station. */
  const [held, setHeld] = useState<string | null>(null)

  return (
    <div className="ch1-task" role="dialog" aria-labelledby="ch1-task-title">
      <div className="ch1-task-card">
        <p className="ch1-task-eyebrow">{task.asker}</p>
        <h3 id="ch1-task-title">{task.title}</h3>
        <p className="ch1-task-question">{task.question}</p>

        {sorting ? (
          <div className="ch1-task-sort">
            <div className="ch1-task-tray" role="group" aria-label="הדברים למיון">
              {task.options.map((o) => {
                const placed = chosen.includes(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`hud-card-btn ch1-sort-item${placed ? ' is-taken' : ''}${held === o.id ? ' is-held' : ''}`}
                    disabled={placed || solved}
                    aria-pressed={held === o.id}
                    onClick={() => setHeld(held === o.id ? null : o.id)}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
            <div className="ch1-task-bins">
              {(task.bins ?? []).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`ch1-sort-bin${held ? ' is-live' : ''}`}
                  disabled={!held || solved}
                  onClick={() => {
                    if (!held) return
                    onSort(held, b.id)
                    setHeld(null)
                  }}
                >
                  <span className="ch1-sort-bin-label">{b.label}</span>
                  <span className="ch1-sort-bin-has">
                    {task.options.filter((o) => chosen.includes(o.id) && o.bin === b.id).map((o) => o.label).join(' · ') || '—'}
                  </span>
                </button>
              ))}
            </div>
            {!held && !solved && (
              <p className="ch1-task-hint">בחרו דבר, ואז את הצד שלו.</p>
            )}
          </div>
        ) : (
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
        )}

        {lastOpt && (
          <p className={`ch1-task-note${lastOk ? ' is-right' : ''}`} role="status" aria-live="polite">
            {lastOk ? lastOpt.note : (lastOpt.wrong ?? lastOpt.note)}
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
