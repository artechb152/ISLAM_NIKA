/* The notebook is chapter 1's only progress surface: no score, no failure, no
   quiz — just the 26 things Rawi writes down as you hear them. It shares the
   versioned-key discipline of chapter6/progress.ts. */

import { NOTEBOOK_TOTAL } from './dialogue'

export const NOTEBOOK_KEY = 'ch1:notebook:v1'

export interface NotebookStore {
  /** Encounter ids already played through to the end. */
  seen: string[]
  /** Notebook entry numbers (1..26) filled in. */
  entries: number[]
  /** Region the player is currently in. */
  region: string
  /** Ids of the evidence already examined — see finds.ts. */
  found: string[]
  /** Ids of the region tasks already worked out — see tasks.ts. */
  solved: string[]
}

const EMPTY: NotebookStore = { seen: [], entries: [], region: 'yemen-heights', found: [], solved: [] }

export function readNotebook(): NotebookStore {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(NOTEBOOK_KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<NotebookStore>
    return {
      seen: Array.isArray(p.seen) ? p.seen.filter((x): x is string => typeof x === 'string') : [],
      entries: Array.isArray(p.entries) ? p.entries.filter((x): x is number => typeof x === 'number') : [],
      region: typeof p.region === 'string' ? p.region : EMPTY.region,
      /* Both arrived after the first save format, so a notebook written before
         them is missing the keys entirely rather than carrying empty ones. */
      found: Array.isArray(p.found) ? p.found.filter((x): x is string => typeof x === 'string') : [],
      solved: Array.isArray(p.solved) ? p.solved.filter((x): x is string => typeof x === 'string') : [],
    }
  } catch {
    return EMPTY
  }
}

function write(store: NotebookStore) {
  try {
    window.localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(store))
  } catch {
    /* private mode — the session still works in memory */
  }
}

export function recordEncounter(encounterId: string, notebookEntry: number): NotebookStore {
  const s = readNotebook()
  if (!s.seen.includes(encounterId)) s.seen = [...s.seen, encounterId]
  if (!s.entries.includes(notebookEntry)) s.entries = [...s.entries, notebookEntry].sort((a, b) => a - b)
  write(s)
  return s
}

/** Write down a piece of evidence the traveller has examined. */
export function recordFind(findId: string): NotebookStore {
  const s = readNotebook()
  if (!s.found.includes(findId)) s.found = [...s.found, findId]
  write(s)
  return s
}

/** Write down a region task the traveller has worked out. */
export function recordTask(taskId: string): NotebookStore {
  const s = readNotebook()
  if (!s.solved.includes(taskId)) s.solved = [...s.solved, taskId]
  write(s)
  return s
}

export function setRegion(region: string): NotebookStore {
  const s = readNotebook()
  s.region = region
  write(s)
  return s
}

export function notebookCount(s: NotebookStore = readNotebook()) {
  return { done: s.entries.length, total: NOTEBOOK_TOTAL }
}

/* A journey you cannot restart is a journey you can play exactly once: the
   intro and the arrival greetings are one-shot localStorage flags, so a
   replay used to be silent from the first step. This clears every chapter-1
   key — progress, intro, arrivals — and leaves the mute preference alone. */
export function resetJourney() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(NOTEBOOK_KEY)
    window.localStorage.removeItem('ch1:intro:v1')
    const dead: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith('ch1:arrived:')) dead.push(k)
    }
    for (const k of dead) window.localStorage.removeItem(k)
  } catch {
    /* private mode: nothing stored, nothing to clear */
  }
}
