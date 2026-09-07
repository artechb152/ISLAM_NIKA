/* Progress for the closing practice, stored SEPARATELY from the chapter's own.

     ch4:v1           — the chapter (reading). Owned by progress.ts. This file never writes it.
     ch4:practice:v1  — this screen. Owned here. progress.ts never writes it.

   The split is chapter 6's, and it matters for one reason: resetting the
   exercises must not cost the reader the chapter they already read, and a
   corrupt store here must not take the chapter down with it.

   EVERY PLACEMENT IS STORED, NOT ONLY THE FINISHED QUESTIONS. The first version
   of this screen kept `solved` in component state alone, so a reader who closed
   the tab came back to a blank board; the second kept only which questions were
   done, so a reader who had placed three of four chips came back to an empty
   one. Chapter 6 stores the individual placements and recomputes everything
   from them, and `work` is that: whatever the question type needs to redraw the
   board exactly as it was left.

   `work` is deliberately `unknown` here. Each question type owns the shape of
   its own board — an array of picks, a map of row→answer, an order of steps —
   and this module refuses to know about any of them. What it does guarantee is
   that a shape it cannot recognise is dropped rather than crashing the screen,
   which is what `sane` is for. */

export const PRACTICE_KEY = 'ch4:practice:v1'

export interface PracticeStore {
  /** questions answered correctly */
  done: string[]
  /** questions that took a wrong attempt on the way — for the focused return */
  missed: string[]
  /** the half-finished board of every question, by question id */
  work: Record<string, unknown>
}

const EMPTY: PracticeStore = { done: [], missed: [], work: {} }

const strings = (v: unknown, known: Set<string>): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && known.has(x)) : []

/** a stored board is kept only if it is a plain array or object — anything else
    is a store written by a different version of this screen */
const sane = (v: unknown): boolean =>
  Array.isArray(v) || (typeof v === 'object' && v !== null)

export function readPractice(known: Set<string>): PracticeStore {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(PRACTICE_KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<PracticeStore> | null
    if (!p || typeof p !== 'object') return EMPTY
    const work: Record<string, unknown> = {}
    if (p.work && typeof p.work === 'object') {
      for (const [k, v] of Object.entries(p.work)) if (known.has(k) && sane(v)) work[k] = v
    }
    return { done: strings(p.done, known), missed: strings(p.missed, known), work }
  } catch {
    /* blocked or corrupt storage must never break the screen */
    return EMPTY
  }
}

export function writePractice(store: PracticeStore): void {
  try {
    window.localStorage.setItem(PRACTICE_KEY, JSON.stringify(store))
  } catch {
    /* blocked storage must never break the screen */
  }
}

/** clears the exercises and NOTHING else. `islam:chapter:4` is not touched: the
    chapter was completed, and choosing to work the questions again does not
    un-complete it. */
export function resetPractice(): PracticeStore {
  try {
    window.localStorage.removeItem(PRACTICE_KEY)
  } catch {
    /* blocked storage must never break the screen */
  }
  return { done: [], missed: [], work: {} }
}
