/* The closing practice's store, for a chapter that does not have its own `practice-progress.ts`.

   It is the same algorithm every chapter's `lib/chapterN/practice-progress.ts` runs, key for
   key: `{done, missed, work}` under one localStorage key, the reading progress (`chN:v1`)
   never touched, a store that cannot be recognised dropped rather than thrown. Chapters 1–14
   keep their own files (nothing about what they store changes); a new chapter can call
   `practiceStore('ch15:practice:v1')` instead of copying a file. */

export interface PracticeStore {
  /** questions answered correctly */
  done: string[]
  /** questions that took a wrong attempt on the way — what the score counts against */
  missed: string[]
  /** the half-finished board of every question, by question id */
  work: Record<string, unknown>
}

export interface PracticeStoreApi {
  read: (known: Set<string>) => PracticeStore
  write: (store: PracticeStore) => void
  reset: () => PracticeStore
}

const empty = (): PracticeStore => ({ done: [], missed: [], work: {} })

const strings = (v: unknown, known: Set<string>): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && known.has(x)) : []

const sane = (v: unknown): boolean => Array.isArray(v) || (typeof v === 'object' && v !== null)

export function practiceStore(key: string): PracticeStoreApi {
  return {
    read(known) {
      if (typeof window === 'undefined') return empty()
      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return empty()
        const p = JSON.parse(raw) as Partial<PracticeStore> | null
        if (!p || typeof p !== 'object') return empty()
        const work: Record<string, unknown> = {}
        if (p.work && typeof p.work === 'object') {
          for (const [k, v] of Object.entries(p.work)) if (known.has(k) && sane(v)) work[k] = v
        }
        return { done: strings(p.done, known), missed: strings(p.missed, known), work }
      } catch {
        return empty()
      }
    },
    write(store) {
      try {
        window.localStorage.setItem(key, JSON.stringify(store))
      } catch {
        /* blocked storage must never break the screen */
      }
    },
    reset() {
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* blocked storage must never break the screen */
      }
      return empty()
    },
  }
}
