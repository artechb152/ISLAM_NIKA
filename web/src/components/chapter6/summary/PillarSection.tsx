'use client'

/* One commandment: its exercise, and then its beat.

   The heading is the article's own `.section-heading` — eyebrow, Kedem title, diamond ornament,
   muted lead, all start-aligned — and the titles come from the five `visual` screens, which
   describe precisely these five pictures („מפת מסע החג' · התחנות שקראתם עליהן, לפי סדרן על
   המסלול“). The closing line is the matching check's own „ok“. The sub-head of the beat is the
   article's `.scrolly-env`: an underlined label, not a card title.

   NO CARD. The content sits on the parchment, the way every interactive block in the chapter
   does. There is no border, no radius and no gold ring around any of this.

   THE ORDER IS surface → feedback → hint → tray. It used to be surface → tray → feedback →
   hint, which put the hint at the very bottom of a tall block: the feedback line said „פתחתי
   רמז מתחת“ and the hint it referred to was several hundred pixels below the fold. */

import Feedback, { Hint, type FeedbackKind } from './Feedback'
import Mcq from './Mcq'
import SlotSurface from './SlotSurface'
import Tray from './Tray'
import { FEEDBACK, beatBank, exerciseBank, type ExerciseDef } from '@/lib/chapter6/summary-data'

export interface SectionState {
  filled: Record<number, string>
  beatFilled: Record<number, string>
  exerciseDone: boolean
  beatDone: boolean
  feedback: { kind: FeedbackKind; text: string }
  beatFeedback: { kind: FeedbackKind; text: string }
  hintOpen: boolean
  beatHintOpen: boolean
  /* options ruled out on this section's multiple-choice beat, if it has one */
  mcqWrong: string[]
}

/* The SLOT ids are the ids the progress store uses, deliberately: one name for one thing means
   there is no place for a translation between the two to go wrong. Item ids get their own
   prefix so they can never collide with them. */
export const exItemId = (key: string, label: string): string => `it:x:${key}:${label}`
export const exSlotId = (key: string, n: number): string => `x-${key}-${n}`
export const beatItemId = (key: string, label: string): string => `it:b:${key}:${label}`
export const beatSlotId = (key: string, n: number): string => `b-${key}-${n}`

function Tick() {
  return (
    <span className="gv-done-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5 10 17.5 19 7.5" />
      </svg>
    </span>
  )
}

export default function PillarSection({
  ex,
  state,
  heldId,
  refused,
  itemPropsFor,
  slotPropsFor,
  onMcq,
}: {
  ex: ExerciseDef
  state: SectionState
  heldId: string | null
  refused: string | null
  itemPropsFor: (id: string) => Record<string, unknown>
  slotPropsFor: (id: string) => Record<string, unknown>
  onMcq: (id: string, answer: string, option: string) => void
}) {
  const placed = new Set(Object.values(state.filled))
  const bank = exerciseBank(ex)
    .filter((t) => !placed.has(t))
    .map((t) => ({ id: exItemId(ex.key, t), text: t }))

  const beatPlaced = new Set(Object.values(state.beatFilled))
  const bBank = beatBank(ex.beat)
    .filter((t) => !beatPlaced.has(t))
    .map((t) => ({ id: beatItemId(ex.key, t), text: t }))

  const titleId = `gv-t-${ex.key}`
  const beatTitleId = `gv-b-${ex.key}`

  return (
    <section className="article-section gv-section" id={`gv-${ex.key}`} aria-labelledby={titleId}>
      {/* the article's heading, verbatim in shape — eyebrow slot, Kedem h2, diamond ornament,
          muted lead — but WITHOUT `data-reveal`: the article hides those until they are
          scrolled into view, and this page has no reveal observer, so the attribute would
          leave every heading permanently at opacity 0.

          THE INSTRUCTION IS THE LEAD. It used to be a separate 20px semibold paragraph below
          the heading, which is a shape the article does not have; the article's heading ends
          in a muted line that says what the block is. Same words, the article's slot — and one
          fewer block between the title and the work.

          STILL NO EYEBROW. It named the commandment directly above a title that is already
          about it; the sidebar names it a second time and marks it as the one you are in. */}
      <header className="section-heading gv-section-head">
        <div>
          <h2 id={titleId}>{ex.title}</h2>
        </div>
        <div className="title-ornament section-ornament" aria-hidden="true">
          <span />
        </div>
        {/* the instruction goes when the exercise is done — „סדרו את התחנות“ over a map with
            every station already named is an instruction for work that no longer exists */}
        {!state.exerciseDone && <p>{ex.ask}</p>}
      </header>

      <div className="gv-ex">
        <SlotSurface
          layout={ex.layout}
          slots={ex.slots}
          surface={ex.surface}
          anyOrder={ex.anyOrder}
          filled={state.filled}
          slotIdFor={(n) => exSlotId(ex.key, n)}
          slotPropsFor={(n) => slotPropsFor(exSlotId(ex.key, n))}
          refused={refused}
          numbersAreOrder={ex.numbersAreOrder}
        />

        {state.exerciseDone ? (
          <p className="gv-done">
            <Tick />
            {ex.done}
          </p>
        ) : (
          <>
            <Feedback kind={state.feedback.kind} text={state.feedback.text} />
            {state.hintOpen && <Hint label={FEEDBACK.hintLabel} text={ex.hint} />}
            <Tray
              items={bank}
              label={FEEDBACK.trayLabel}
              heldId={heldId}
              itemPropsFor={itemPropsFor}
              emptyText={FEEDBACK.empty}
            />
          </>
        )}
      </div>

      {/* the beat appears in RESPONSE to finishing the exercise, so it simply is there — no
          fade-in-on-scroll, which would leave something that just arrived at opacity 0.

          It is separated from the exercise by the article's own device for a second block
          inside one section — the hairline `.charity-body .content-block + .content-block`
          draws — rather than by a large margin and nothing else. A hairline says „a new
          thing“; 58px of blank parchment says „something is missing here“. */}
      {state.exerciseDone && (
        <div className="gv-ex gv-beat">
          {/* the heading stays in the document for anyone navigating by headings, but it is not
              drawn: „החשבון“ above a question that reads „המאזן השנתי של אדם הוא 10,000
              שקלים…“ was a label for something that already announces itself. */}
          <h3 id={beatTitleId} className="sr-only">
            {ex.beat.title}
          </h3>

          {/* a beat is EITHER a multiple-choice question or a sentence with gaps. The charity
              beat is the first: it is `ch-c`, which the source itself writes as a single-choice
              question, and dressing it as a fill-the-gap sentence with a four-item tray was the
              same question in a costume. */}
          {ex.beat.mcq ? (
            <Mcq
              q={ex.beat.mcq}
              answered={state.beatDone}
              wrong={state.mcqWrong}
              onPick={(o) => onMcq(ex.beat.mcq!.id, ex.beat.mcq!.answer, o)}
            />
          ) : state.beatDone ? (
            <>
              <SlotSurface
                layout="sentence"
                slots={ex.beat.slots}
                sentence={ex.beat.sentence}
                filled={state.beatFilled}
                slotIdFor={(n) => beatSlotId(ex.key, n)}
                refused={null}
                numbersAreOrder={false}
              />
            </>
          ) : (
            <>
              <p className="gv-ask">{ex.beat.ask}</p>
              <SlotSurface
                layout="sentence"
                slots={ex.beat.slots}
                sentence={ex.beat.sentence}
                filled={state.beatFilled}
                slotIdFor={(n) => beatSlotId(ex.key, n)}
                slotPropsFor={(n) => slotPropsFor(beatSlotId(ex.key, n))}
                refused={refused}
                numbersAreOrder={false}
              />
              <Feedback kind={state.beatFeedback.kind} text={state.beatFeedback.text} />
              {state.beatHintOpen && <Hint label={FEEDBACK.hintLabel} text={ex.beat.hint} />}
              <Tray
                items={bBank}
                label={FEEDBACK.trayLabel}
                heldId={heldId}
                itemPropsFor={itemPropsFor}
                emptyText={FEEDBACK.empty}
              />
            </>
          )}

          {/* the reward, shared by both kinds of beat: the Arabic blessing and the pictures
              that only make sense once the answer is in */}
          {state.beatDone && ex.beat.arabic && (
            <blockquote className="arabic-quote gv-beat-arabic" lang="ar" dir="rtl">
              {ex.beat.arabic}
            </blockquote>
          )}
          {state.beatDone && !!ex.beat.after?.length && (
            <div className={'gv-after n' + ex.beat.after.length}>
              {ex.beat.after.map((a) => (
                <figure key={a.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/assets/chapter6/${a.src}`} alt="" loading="lazy" decoding="async" />
                  <figcaption>{a.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
