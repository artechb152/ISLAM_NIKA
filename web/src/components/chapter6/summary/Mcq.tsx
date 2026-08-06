'use client'

/* A multiple-choice question, in the article's button language.

   Three or four pill buttons on the parchment. A wrong answer FADES OUT and stays out, which
   is the chapter's own `.practice-option.is-wrong{opacity:.38}` pattern: it narrows the field
   instead of resetting it, so a mistake leaves the reader closer to the answer than they were.
   Nothing is deleted, nothing is scored, and the count of attempts is never shown.

   The right answer locks the row and the source's own „ok“ line takes over — one sentence that
   teaches, rather than a tick that congratulates. */

import { FEEDBACK, type McqDef } from '@/lib/chapter6/summary-data'

export default function Mcq({
  q,
  answered,
  wrong,
  onPick,
}: {
  q: McqDef
  answered: boolean
  /* the options already tried and ruled out */
  wrong: string[]
  onPick: (option: string) => void
}) {
  return (
    <div className="gv-mcq">
      <p className="gv-mcq-q" id={`mcq-${q.id}`}>
        {q.question}
      </p>
      <div className="gv-mcq-opts" role="group" aria-labelledby={`mcq-${q.id}`}>
        {q.options.map((o) => {
          const isWrong = wrong.includes(o)
          const isPicked = answered && o === q.answer
          return (
            <button
              key={o}
              type="button"
              className={'gv-pick' + (isWrong ? ' is-wrong' : '') + (isPicked ? ' is-right' : '')}
              onClick={() => onPick(o)}
              disabled={answered || isWrong}
              aria-disabled={answered || isWrong ? true : undefined}
            >
              {o}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className="gv-done">
          <span className="gv-done-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5 10 17.5 19 7.5" />
            </svg>
          </span>
          {q.ok}
        </p>
      )}
      {/* nothing at all until there IS something to say. The exercises reserve a feedback line
          because their surface has a running count to report („נותרו שתי משבצות“); a question
          with no answer yet has nothing, and reserving the row left a stray diamond floating
          under every set of options. */}
      {!answered && wrong.length > 0 && (
        <p className="gv-feedback is-miss">
          <span className="gv-fb-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14H17a4 4 0 0 0 0-8h-6M9 14l3-3M9 14l3 3" />
            </svg>
          </span>
          <span className="gv-fb-text">{FEEDBACK.mcqWrong}</span>
        </p>
      )}
    </div>
  )
}
