/* Progress for the closing screen, stored SEPARATELY from the chapter's own progress.

     ch6:v1           — the chapter (reading). Owned by progress.ts. This file never writes it.
     ch6:practice:v1  — this screen. Owned here. progress.ts never writes it.

   The split matters for one reason: resetting this screen must not cost the reader the chapter
   they already read, and a corrupt store here must not take the chapter down with it.

   TWO DEGREES PER COMMANDMENT. The five plates at the top are the whole progress display —
   there is no separate bar, and no score:

     0  nothing yet           muted name · pale icon · dashed rule
     1  its exercise complete     the rule and the name turn maroon
     2  its beat complete         the icon comes up to full colour

   There used to be a third, earned by an opening round that matched five situations onto the
   five commandments. That round is gone, and with it the first rung.

   Only the placed ids are stored; every degree and flag is recomputed from them on read, so a
   hand-edited `"completed": true` cannot light a commandment whose slots were never filled.

   CROSS-FILE CONTRACT: Chapter6.tsx imports `readPractice` and reads `.completed` to decide
   whether its closing button shows the „הושלם“ chip. Keep both names. */

import { EXERCISES, QUIZ, type PillarKey } from './summary-data'

export const PRACTICE_KEY = 'ch6:practice:v1'

/* namespaced so an id can never collide with a slot id */
export const CLOSING_ID = 'closing'

export const slotId = (key: PillarKey, n: number): string => `x-${key}-${n}`
export const beatId = (key: PillarKey, n: number): string => `b-${key}-${n}`

/* A stored entry is usually just a slot id. Where any label may go in any slot — the charity
   recipients — the id alone cannot say WHICH label was put where, so the label is appended
   after a pipe. Everything that reasons about progress reads through `idOf`, so a filled slot
   counts as filled either way, and a store written before this existed still loads. */
export const idOf = (entry: string): string => entry.split('|')[0]
export const labelIn = (entry: string): string | undefined => entry.split('|')[1]

/* a locked slot is furniture, not a task — it is never part of what has to be filled */
const openSlots = (ex: (typeof EXERCISES)[number]) => ex.slots.filter((s) => !s.locked)
const openBeatSlots = (ex: (typeof EXERCISES)[number]) => ex.beat.slots.filter((s) => !s.locked)

const VALID = new Set<string>([
  ...EXERCISES.flatMap((ex) => [
    ...openSlots(ex).map((s) => slotId(ex.key, s.n)),
    ...openBeatSlots(ex).map((s) => beatId(ex.key, s.n)),
  ]),
  ...QUIZ.map((q) => q.id),
  CLOSING_ID,
])

export type Degree = 0 | 1 | 2

export interface PracticeProgress {
  done: string[]
  degrees: Record<PillarKey, Degree>
  /* per commandment: is its exercise finished, is its beat finished */
  exerciseDone: Record<PillarKey, boolean>
  beatDone: Record<PillarKey, boolean>
  /* the two closing questions, by their own ids */
  quizDone: Record<string, boolean>
  closingDone: boolean
  completed: boolean
}

export function emptyProgress(): PracticeProgress {
  return derive([])
}

export function derive(ids: string[]): PracticeProgress {
  const done = ids.filter((id) => VALID.has(idOf(id)))
  const set = new Set(done.map(idOf))

  const degrees = {} as Record<PillarKey, Degree>
  const exerciseDone = {} as Record<PillarKey, boolean>
  const beatDone = {} as Record<PillarKey, boolean>

  for (const ex of EXERCISES) {
    const exDone = openSlots(ex).every((s) => set.has(slotId(ex.key, s.n)))
    const bDone = openBeatSlots(ex).every((s) => set.has(beatId(ex.key, s.n)))
    exerciseDone[ex.key] = exDone
    beatDone[ex.key] = bDone
    /* a ladder, not a tally: the icon cannot come up before the name does, even if the beat
       were somehow recorded first */
    degrees[ex.key] = !exDone ? 0 : !bDone ? 1 : 2
  }

  const allFull = EXERCISES.every((ex) => degrees[ex.key] === 2)

  const quizDone = {} as Record<string, boolean>
  for (const q of QUIZ) quizDone[q.id] = set.has(q.id)
  const allQuiz = QUIZ.every((q) => set.has(q.id))

  return {
    done,
    degrees,
    exerciseDone,
    beatDone,
    quizDone,
    closingDone: set.has(CLOSING_ID),
    completed: allFull && allQuiz && set.has(CLOSING_ID),
  }
}

/* Never trusts what it reads: a half-written store, a string where an array belongs, or a
   shape from an earlier version all land on a fresh screen rather than a thrown render. */
export function readPractice(): PracticeProgress {
  if (typeof window === 'undefined') return emptyProgress()
  try {
    const raw = window.localStorage.getItem(PRACTICE_KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as { done?: unknown } | null
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.done)) return emptyProgress()
    return derive(parsed.done.filter((v): v is string => typeof v === 'string'))
  } catch {
    return emptyProgress()
  }
}

function write(done: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PRACTICE_KEY, JSON.stringify({ v: 2, done }))
  } catch {
    /* blocked or full storage must never break the screen — the session stays in memory */
  }
}

/* Called once per correct placement. Never on render. */
export function recordDone(id: string): PracticeProgress {
  const current = readPractice()
  if (current.done.some((e) => idOf(e) === idOf(id))) return current
  const next = derive([...current.done, id])
  write(next.done)
  return next
}

/* „לחזרה על התרגול“ — clears THIS store only. ch6:v1 and islam:chapter:6 are left exactly as
   they are: a chapter already earned is not taken back because the reader wants another go. */
export function resetPractice(): PracticeProgress {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PRACTICE_KEY)
    } catch {}
  }
  return emptyProgress()
}
