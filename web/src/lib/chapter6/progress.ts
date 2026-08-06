/* Scroll-progress persistence for the continuous chapter-6 article.

   It writes the SAME store the rest of the product already reads: `ch6:v1` (the engine's
   shape — `done` keyed by screen id out of the 44 screens, `screen` as a resume index). The
   chapters screen derives its percentage from `done`, so a section is recorded by marking
   every screen id belonging to that section — nothing outside this file needs to know the
   article replaced the screen-by-screen lesson.

   `islam:chapter:6 = 'done'` is NO LONGER written by finishing the article. The chapter ends
   in its closing practice, so the flag moved to markChapterComplete() below, which the
   practice page calls. See the comment there for why the chapters screen needed no change. */

import { CH6 } from './data'

export const STORE_KEY = 'ch6:v1'

/* DOM section id (the scroll anchors) → the `section` label the data carries. Two anchors
   share the opening because the article splits it into the film and the pillars overview.
   The article ends on the hajj (the old 'summary' anchor was removed with the practice screen),
   so the hajj — the last section — is completed by reaching the chapter's closing block, not by
   scrolling into a next anchor. */
const DOM_TO_DATA: Record<string, string> = {
  opening: 'פתיחה',
  pillars: 'פתיחה',
  shahada: 'השהאדה',
  prayer: 'התפילה',
  charity: 'הצדקה',
  ramadan: 'צום רמדאן',
  hajj: "החג'",
}

/* article order — completion of anchor i is earned by scrolling into anchor i+1; the final
   anchor (hajj) is completed by markChapterComplete() when the reader reaches the closing block */
export const SECTION_ORDER = Object.keys(DOM_TO_DATA)

export interface Ch6Store {
  screen: number
  done: Record<string, boolean>
  mech: Record<string, boolean>
  completed: boolean
  /* article-only extras; the engine and the chapters screen ignore them */
  section?: string
  sections?: string[]
}

export function readStore(): Ch6Store {
  const empty: Ch6Store = { screen: 0, done: {}, mech: {}, completed: false }
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return empty
    const p = JSON.parse(raw) as Partial<Ch6Store> | null
    if (!p || typeof p !== 'object') return empty
    return {
      screen: typeof p.screen === 'number' ? p.screen : 0,
      done: p.done || {},
      mech: p.mech || {},
      completed: !!p.completed,
      section: typeof p.section === 'string' ? p.section : undefined,
      sections: Array.isArray(p.sections) ? p.sections.filter((s) => typeof s === 'string') : undefined,
    }
  } catch {
    return empty
  }
}

function writeStore(store: Ch6Store): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* blocked storage must never break the chapter */
  }
}

function screenIdsOf(domId: string): string[] {
  const data = DOM_TO_DATA[domId]
  return CH6.screens.filter((s) => s.section === data).map((s) => s.id)
}

function firstScreenIndexOf(domId: string): number {
  const data = DOM_TO_DATA[domId]
  const index = CH6.screens.findIndex((s) => s.section === data)
  return index < 0 ? 0 : index
}

/* the last anchor the reader was on — the resume point; never rewinds `done` */
export function saveCurrentSection(domId: string): void {
  if (!(domId in DOM_TO_DATA)) return
  const store = readStore()
  if (store.section === domId) return
  store.section = domId
  store.screen = firstScreenIndexOf(domId)
  writeStore(store)
}

/* a commandment counts as finished only when the reader scrolled into the NEXT one */
export function markSectionDone(domId: string): Ch6Store {
  const store = readStore()
  const sections = new Set(store.sections || [])
  if (!sections.has(domId)) {
    sections.add(domId)
    for (const id of screenIdsOf(domId)) store.done[id] = true
    store.sections = [...sections]
    writeStore(store)
  }
  return store
}

/* Reaching the end of the article means the CONTENT was read — it no longer means the chapter
   is finished, because the chapter now ends in its own practice page (/chapter6/practice).

   So this records everything it always did inside ch6:v1, and deliberately does NOT write
   islam:chapter:6. The chapters screen reads both: the flag first (100%), and otherwise a
   percentage derived from `done` which it already clamps at 99. That clamp is what makes the
   in-between state — content read, practice pending — display correctly with no change to
   ChaptersScreen and no change to the ch6:v1 format. */
export function markContentComplete(): Ch6Store {
  const store = readStore()
  for (const s of CH6.screens) store.done[s.id] = true
  store.sections = [...SECTION_ORDER]
  store.completed = true
  writeStore(store)
  return store
}

/* The chapter is done only once the closing practice is done. Called from the practice page
   and from nowhere else. Idempotent, so a returning reader whose earlier write failed still
   ends up marked complete. */
export function markChapterComplete(): Ch6Store {
  const store = markContentComplete()
  try {
    localStorage.setItem('islam:chapter:6', 'done')
  } catch {
    /* blocked storage must never break the chapter */
  }
  return store
}

export function resumeSectionId(): string | null {
  const store = readStore()
  if (store.section && store.section in DOM_TO_DATA && store.section !== 'opening') return store.section
  return null
}

export function completedSections(): string[] {
  return readStore().sections || []
}
