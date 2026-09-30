/* Progress for the closing practice, stored SEPARATELY from the chapter's own.

     ch2:v1           — the chapter (reading). Owned by progress.ts.
     ch2:practice:v1  — this screen. Owned here.

   Chapter 4's split, part for part: a corrupt store here must not take the
   chapter's reading progress down with it. `islam:chapter:2` is still written
   only by `markChapterComplete()`, when the last question is solved.

   `work` is each question's board as it was left — picks, a row→answer map, or
   an order of steps — kept as `unknown` because each question type owns its
   shape. A shape this module cannot recognise is dropped, not crashed on. */

export const PRACTICE_KEY = 'ch2:practice:v1'

export interface PracticeStore {
  /** questions answered correctly */
  done: string[]
  /** questions that took a wrong attempt on the way */
  missed: string[]
  /** the half-finished board of every question, by question id */
  work: Record<string, unknown>
}

const EMPTY: PracticeStore = { done: [], missed: [], work: {} }

const strings = (v: unknown, known: Set<string>): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && known.has(x)) : []

const sane = (v: unknown): boolean => Array.isArray(v) || (typeof v === 'object' && v !== null)

/** `known` filters out ids of questions that no longer exist */
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
