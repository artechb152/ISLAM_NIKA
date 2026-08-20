'use client'

/* „חמש מצוות היסוד“ — the chapter's closing screen.

   IT IS THE ARTICLE'S PAGE. Same masthead, same persistent sidebar, same `.chapter-layout`
   content column, same full-bleed opening banner, same `.article-section` rhythm — see
   PracticeNav for the shell and the reasoning. What is left in this file is the exercise
   itself, not a second page design.

   EVERYTHING IS ON THE PAGE FROM THE FIRST FRAME. The sections used to unlock one at a time,
   which meant a reader could not see what they had signed up for, or skip to the part they
   wanted. Only the beats stay hidden until their exercise is done, because several of them
   print the answer to it.

   ONE LIVE REGION, at the bottom, fed by usePickPlace. The feedback line under each exercise is
   a plain paragraph. When both were live, a single placement was announced twice.

   Storage is read in an effect, never during render: localStorage does not exist on the server
   and reading it while rendering is the classic hydration mismatch. `restored` remembers
   whether the screen was already finished on arrival, so a returning reader is not shown the
   completion a second time as an event. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ChapterEnd from './ChapterEnd'
import { type FeedbackKind } from './Feedback'
import Mcq from './Mcq'
import PracticeNav, { type NavStop } from './PracticeNav'
import PillarSection, { beatSlotId, exSlotId, type SectionState } from './PillarSection'
import { usePickPlace } from './usePickPlace'
import {
  CLOSING,
  END,
  EXERCISES,
  FEEDBACK,
  HERO,
  PILLARS,
  QUIZ,
  QUIZ_BLOCK,
  PILLAR_NAME,
  type PillarKey,
} from '@/lib/chapter6/summary-data'
import {
  CLOSING_ID,
  emptyProgress,
  idOf,
  labelIn,
  readPractice,
  recordDone,
  resetPractice,
  type PracticeProgress,
} from '@/lib/chapter6/practice-progress'
import { markChapterComplete } from '@/lib/chapter6/progress'

type Fb = { kind: FeedbackKind; text: string }

const byKey = new Map(EXERCISES.map((ex) => [ex.key, ex]))

/* an item id carries which card it came from, which is the card its feedback belongs in */
function cardOf(itemId: string): string {
  const m = /^it:([xb]):([^:]+):/.exec(itemId)
  return m ? `${m[1]}:${m[2]}` : ''
}

export default function SummaryPage() {
  const [progress, setProgress] = useState<PracticeProgress>(emptyProgress)
  const [ready, setReady] = useState(false)
  const restored = useRef(false)

  /* per EXERCISE, not per page: five sections each need their own miss count and their own
     hint, and one page-level hint would have been shown in the wrong four of them */
  const [misses, setMisses] = useState<Record<string, number>>({})
  const [hints, setHints] = useState<Record<string, boolean>>({})
  const [fbs, setFbs] = useState<Record<string, Fb>>({})
  /* There is no „which slot just filled“ state any more. It existed to drive a settle
     animation on the newly-placed label and an `is-fresh` lift on the five-plate row; the row
     is gone and the slot animation was never written, so it was three pieces of state, a regex
     helper and four props feeding a class name with no rule behind it. Every placement is
     already confirmed in words on the feedback line. */
  const [closingMiss, setClosingMiss] = useState<PillarKey | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    const saved = readPractice()
    restored.current = saved.completed
    setProgress(saved)
    setReady(true)
  }, [])

  /* the chapter is marked done HERE and nowhere else */
  useEffect(() => {
    if (ready && progress.completed) markChapterComplete()
  }, [ready, progress.completed])

  /* NO reveal-on-scroll here, deliberately. The article fades blocks in as you reach them, and
     an earlier draft of this screen copied that — which produced a page where 51 of 61
     automated checks passed against elements sitting at opacity 0, because a headless click
     does not care whether it can see what it clicks. On this page every block appears in
     RESPONSE to an action rather than on scroll, so a fade-in-when-scrolled-to is the wrong
     mechanism outright: something that just arrived should simply be there. */

  const done = useMemo(() => new Set(progress.done.map(idOf)), [progress.done])
  /* which label ended up in which slot, for the exercises where any label may go anywhere */
  const placed = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of progress.done) {
      const label = labelIn(e)
      if (label) m.set(idOf(e), label)
    }
    return m
  }, [progress.done])

  /* the options ruled out on each multiple-choice question, keyed by question id */
  const [mcqWrong, setMcqWrong] = useState<Record<string, string[]>>({})

  const answerMcq = useCallback((id: string, answer: string, option: string) => {
    if (option === answer) {
      setProgress(recordDone(id))
      return
    }
    setMcqWrong((w) => ({ ...w, [id]: [...(w[id] ?? []), option] }))
  }, [])

  /* ---------------------------------------------------------------- placing ---- */

  const labelOf = useCallback((id: string): string => {
    const m = /^it:[xb]:[^:]+:([\s\S]*)$/.exec(id)
    return m ? m[1] : id
  }, [])

  const slotLabelOf = useCallback((slotId: string): string => {
    const m = /^([xb])-([^-]+)-(\d+)$/.exec(slotId)
    return m ? `משבצת ${m[3]}` : slotId
  }, [])

  const registerMiss = useCallback((card: string, override?: string) => {
    setMisses((m) => {
      const n = (m[card] ?? 0) + 1
      if (n >= 2) setHints((h) => ({ ...h, [card]: true }))
      setFbs((f) => ({
        ...f,
        [card]: { kind: 'miss', text: override ?? (n >= 2 ? FEEDBACK.wrongAgain : FEEDBACK.wrong) },
      }))
      return { ...m, [card]: n }
    })
  }, [])

  const onPlace = useCallback(
    (itemId: string, slotId: string): boolean => {
      const card = cardOf(itemId)

      /* one kind of placement: a label onto a numbered slot of the same commandment. There
         used to be a second — a situation onto one of the five plates, in an opening round
         that no longer exists. */
      const im = /^it:([xb]):([^:]+):([\s\S]*)$/.exec(itemId)
      const sm = /^([xb])-([^-]+)-(\d+)$/.exec(slotId)
      if (!im || !sm) {
        registerMiss(card)
        return false
      }
      const [, kind, key, label] = im
      const [, sKind, sKey, sN] = sm
      const ex = byKey.get(key as PillarKey)
      if (!ex || kind !== sKind || key !== sKey) {
        registerMiss(card)
        return false
      }
      const n = Number(sN)
      const slots = kind === 'x' ? ex.slots : ex.beat.slots
      const slot = slots.find((s) => s.n === n)
      if (!slot) {
        registerMiss(card)
        return false
      }
      if (slot.locked) {
        registerMiss(card, FEEDBACK.lockedSlot)
        return false
      }

      const id = kind === 'x' ? exSlotId(key, n) : beatSlotId(key, n)
      /* ANY LABEL IN ANY SLOT, where the exercise says so. The charity recipients come from a
         list in one sentence — „לעניים, נזקקים, יתומים, בתי תמחוי ועוד“ — and insisting each
         one go in the position that sentence happens to give it tests the sentence's word
         order, not the chapter. So the label only has to be one of this exercise's answers
         that is not placed yet, and the pairing is stored alongside the slot id. */
      if (kind === 'x' && ex.anyOrder) {
        const already = new Set(
          slots
            .filter((s) => !s.locked)
            .map((s) => placed.get(exSlotId(key, s.n)))
            .filter(Boolean)
        )
        const isAnAnswer = slots.some((s) => !s.locked && s.answer === label)
        if (!isAnAnswer || already.has(label)) {
          registerMiss(card)
          return false
        }
        setProgress(recordDone(`${id}|${label}`))
        const left = slots.filter((s) => !s.locked).length - already.size - 1
        setFbs((f) => ({ ...f, [card]: { kind: 'ok', text: FEEDBACK.placed(label, left) } }))
        return true
      }

      if (slot.answer !== label) {
        registerMiss(card)
        return false
      }

      setProgress(recordDone(id))
      const left = slots.filter((s) => {
        if (s.locked) return false
        const sid = kind === 'x' ? exSlotId(key, s.n) : beatSlotId(key, s.n)
        return sid !== id && !done.has(sid)
      }).length
      setFbs((f) => ({ ...f, [card]: { kind: 'ok', text: FEEDBACK.placed(label, left) } }))
      return true
    },
    [done, placed, registerMiss]
  )

  const pp = usePickPlace({ onPlace, labelOf, slotLabelOf })

  /* ------------------------------------------------------------- new content ---- */

  /* ONE auto-scroll, to the end block, and only the first time it appears. Everything else on
     the page is already on the page, so there is nothing to be shown to — the version that
     unlocked sections had to chase the reader around and it made the page feel jumpy. A
     restored session arrives already complete, so `seen` starts as „already seen“. */
  const seenEnd = useRef<boolean | null>(null)
  useEffect(() => {
    if (!ready) return
    if (seenEnd.current === null) {
      seenEnd.current = progress.completed
      return
    }
    if (!progress.completed || seenEnd.current) return
    seenEnd.current = true
    const el = document.getElementById('gv-end')
    if (!el) return
    const smooth = !window.matchMedia('(prefers-reduced-motion:reduce)').matches
    requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    )
  }, [ready, progress.completed])

  /* --------------------------------------------------------------- the rest ---- */

  function answerClosing(key: PillarKey): void {
    if (key === CLOSING.answer) {
      setClosingMiss(null)
      setProgress(recordDone(CLOSING_ID))
    } else {
      setClosingMiss(key)
    }
  }

  function handleReset(): void {
    setProgress(resetPractice())
    restored.current = false
    seenEnd.current = false
    setMisses({})
    setHints({})
    setFbs({})
    setMcqWrong({})
    setClosingMiss(null)
    setConfirmReset(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const missedPillars = useMemo(
    () =>
      EXERCISES.map((ex) => ex.key).filter(
        (k) => (misses[`x:${k}`] ?? 0) + (misses[`b:${k}`] ?? 0) > 0
      ),
    [misses]
  )

  /* the sidebar's seven stops, and the one place „what is left“ is answered */
  const stops: NavStop[] = useMemo(() => {
    const list: NavStop[] = EXERCISES.map((ex) => ({
      id: `gv-${ex.key}`,
      label: PILLAR_NAME[ex.key],
      done: progress.degrees[ex.key] === 2,
    }))
    list.push({ id: 'gv-quiz', label: QUIZ_BLOCK.title, done: QUIZ.every((q) => progress.quizDone[q.id]) })
    list.push({ id: 'gv-closing', label: CLOSING.title, done: progress.closingDone })
    /* the label is the block's own title, like every other stop in this list — a hardcoded
       „סוף הפרק“ here named the last stop something the page never says */
    if (progress.completed) list.push({ id: 'gv-end', label: END.title, done: true })
    return list
  }, [progress])

  function stateFor(key: PillarKey): SectionState {
    const ex = byKey.get(key)!
    const filled: Record<number, string> = {}
    /* an any-order exercise stores WHICH label went where; everywhere else the slot's own
       answer is the only thing that can be in it */
    for (const s of ex.slots)
      if (!s.locked && done.has(exSlotId(key, s.n)))
        filled[s.n] = placed.get(exSlotId(key, s.n)) ?? s.answer
    const beatFilled: Record<number, string> = {}
    for (const s of ex.beat.slots)
      if (!s.locked && done.has(beatSlotId(key, s.n))) beatFilled[s.n] = s.answer

    const leftX = ex.slots.filter((s) => !s.locked && !done.has(exSlotId(key, s.n))).length
    const leftB = ex.beat.slots.filter((s) => !s.locked && !done.has(beatSlotId(key, s.n))).length

    return {
      filled,
      beatFilled,
      exerciseDone: progress.exerciseDone[key],
      beatDone: progress.beatDone[key],
      feedback: fbs[`x:${key}`] ?? { kind: 'idle', text: leftX ? FEEDBACK.remaining(leftX) : '' },
      beatFeedback: fbs[`b:${key}`] ?? { kind: 'idle', text: leftB ? FEEDBACK.remaining(leftB) : '' },
      hintOpen: !!hints[`x:${key}`],
      beatHintOpen: !!hints[`b:${key}`],
      mcqWrong: ex.beat.mcq ? (mcqWrong[ex.beat.mcq.id] ?? []) : [],
    }
  }

  return (
    <PracticeNav stops={stops}>
      <main className="chapter-article gv-article">
        {/* THE CHAPTER'S OWN BANNER. The article opens on a full-bleed 370px band with the
            title in cream over the poster; this page opened on a small centred maroon line
            over a row of icons — a different masthead, a different alignment, a different
            scale. It is the same component now, without the video: a practice screen has no
            business autoplaying the chapter's film a second time. */}
        <div className="ch6-hero gv-banner">
          <div className="ch6-hero-media" aria-hidden="true" />
          {/* The title alone. There was an eyebrow above it reading „תרגול מסכם · פרק 6“ —
              which named the screen, named the chapter, and sat over an h1 that named neither.
              The h1 says it now; the masthead's „חזרה לפרק 6“ and the sidebar say the rest. */}
          <div className="ch6-hero-copy">
            <h1 id="gv-title" className="ch6-hero-title">
              {HERO.title}
            </h1>
          </div>
        </div>

        {/* ---------------- the five commandments, all of them ---------------- */}
        {EXERCISES.map((ex) => (
          <PillarSection
            key={ex.key}
            ex={ex}
            state={stateFor(ex.key)}
            heldId={pp.held}
            refused={pp.refused}
            itemPropsFor={(id) => pp.itemProps(id)}
            slotPropsFor={(id) => pp.slotProps(id)}
            onMcq={answerMcq}
          />
        ))}

        {/* ---------------- two questions, in the article's two-column block ---------------- */}
        <section className="article-section gv-section" id="gv-quiz" aria-labelledby="gv-quiz-t">
          <header className="section-heading gv-section-head">
            <div>
              <h2 id="gv-quiz-t">{QUIZ_BLOCK.title}</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true">
              <span />
            </div>
            <p>{QUIZ_BLOCK.ask}</p>
          </header>
          {/* `.content-columns.two-columns` is the article's own side-by-side block, hairline
              above each column and all. Stacked, the two questions read as a form; side by
              side they read as the page's one wide element, and the block halves in height. */}
          <div className="content-columns two-columns gv-quiz">
            {QUIZ.map((q) => (
              <div className="content-block" key={q.id}>
                <Mcq
                  q={q}
                  answered={!!progress.quizDone[q.id]}
                  wrong={mcqWrong[q.id] ?? []}
                  onPick={(o) => answerMcq(q.id, q.answer, o)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- the closing ---------------- */}
        <section className="article-section gv-section gv-closing" id="gv-closing" aria-labelledby="gv-closing-t">
          {/* the same heading every other section has. It used to be a lone 38px line with no
              ornament and no lead — the one block on the page that announced itself in a
              different voice. */}
          <header className="section-heading gv-section-head">
            <div>
              <h2 id="gv-closing-t">{CLOSING.title}</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true">
              <span />
            </div>
            {/* the question STAYS once it is answered. It used to be the whole h2 and vanish
                with the buttons, which left a returning reader a gold-framed clause and no
                sign of what it was the answer to. */}
            <p>{CLOSING.ask}</p>
          </header>

          {progress.closingDone ? (
            <div className="gv-closing-ok">
              <blockquote className="shahada-quote gv-closing-quote">
                <span className="sq-mark sq-open" aria-hidden="true">”</span>
                <p>{CLOSING.ok}</p>
                <span className="sq-mark sq-close" aria-hidden="true">”</span>
              </blockquote>
              <p className="gv-closing-note">{CLOSING.okNote}</p>
            </div>
          ) : (
            <>
              <div className="gv-closing-picks" role="group" aria-label={CLOSING.ask}>
                {PILLARS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={'gv-pick' + (closingMiss === p.key ? ' is-wrong' : '')}
                    onClick={() => answerClosing(p.key)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="gv-closing-miss">{closingMiss ? CLOSING.miss : ''}</p>
            </>
          )}
        </section>

        {progress.completed && (
          <div
            className={
              'article-section gv-fin' + (restored.current ? ' is-restored' : ' is-fresh')
            }
            id="gv-end"
          >
            <ChapterEnd
              missed={missedPillars}
              onReset={handleReset}
              confirmReset={confirmReset}
              onAskReset={() => setConfirmReset(true)}
              onCancelReset={() => setConfirmReset(false)}
            />
          </div>
        )}
      </main>

      {/* THE one live region on the page */}
      <p className="sr-only" aria-live="polite">
        {pp.say}
      </p>

      {/* everything that can be dragged is a label, so the ghost is always a chip — the
          photograph branch belonged to the opening round's situation cards */}
      {pp.ghost && (
        <span className="gv-ghost" style={{ left: pp.ghost.x, top: pp.ghost.y }} aria-hidden="true">
          <span className="gv-ghost-chip">{labelOf(pp.ghost.id)}</span>
        </span>
      )}
    </PracticeNav>
  )
}
