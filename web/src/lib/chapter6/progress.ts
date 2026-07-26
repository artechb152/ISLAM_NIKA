/* Scroll-progress persistence for the continuous chapter-6 article.

   It writes the SAME store the rest of the product already reads: `ch6:v1` (the engine's
   shape — `done` keyed by screen id out of the 44 screens, `screen` as a resume index) and
   `islam:chapter:6 = 'done'` on completion. The chapters screen derives its percentage from
   `done`, so a section is recorded by marking every screen id belonging to that section —
   nothing outside this file needs to know the article replaced the screen-by-screen lesson. */

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

export function markChapterComplete(): Ch6Store {
  const store = readStore()
  for (const s of CH6.screens) store.done[s.id] = true
  store.sections = [...SECTION_ORDER]
  store.completed = true
  writeStore(store)
  try {
    localStorage.setItem('islam:chapter:6', 'done')
  } catch {}
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
