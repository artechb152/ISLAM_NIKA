/* Progress for the closing practice, stored SEPARATELY from the chapter's own —
   chapter 4's `practice-progress.ts`, key for key.

     ch3:v1           — the chapter (reading). Owned by progress.ts.
     ch3:practice:v1  — this screen. Owned here.

   Resetting the exercises must not cost the reader the chapter they read, and a
   corrupt store here must not take the chapter down with it.

   EVERY PLACEMENT IS STORED, NOT ONLY THE FINISHED QUESTIONS. The screen kept
   `solved` in component state alone, so a reader who reloaded came back to a
   blank board. `work` is whatever each question type needs to redraw its board
   exactly as it was left; this module does not know the shapes, and drops any it
   cannot recognise rather than crash the screen. */

export const PRACTICE_KEY = 'ch3:practice:v1'

export interface PracticeStore {
  /** questions answered correctly */
  done: string[]
  /** the half-finished board of every question, by question id */
  work: Record<string, unknown>
}

const EMPTY: PracticeStore = { done: [], work: {} }

const sane = (v: unknown): boolean => Array.isArray(v) || (typeof v === 'object' && v !== null)

export function readPractice(known: Set<string>): PracticeStore {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(PRACTICE_KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<PracticeStore> | null
    if (!p || typeof p !== 'object') return EMPTY
    const done = Array.isArray(p.done)
      ? p.done.filter((x): x is string => typeof x === 'string' && known.has(x))
      : []
    const work: Record<string, unknown> = {}
    if (p.work && typeof p.work === 'object') {
      for (const [k, v] of Object.entries(p.work)) if (known.has(k) && sane(v)) work[k] = v
    }
    return { done, work }
  } catch {
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
