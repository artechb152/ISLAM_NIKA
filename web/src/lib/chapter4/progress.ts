/* Scroll-progress persistence for chapter 4 — the same discipline as chapter 6:
   a versioned key, a section is credited only when the reader scrolls PAST it,
   and reaching the closing block hands the chapter over to its practice.

   `islam:chapter:4 = 'done'` is written by the practice page and by nowhere
   else, exactly as chapter 6 does it: finishing the reading is not finishing
   the chapter. The chapters screen reads the flag for 100% and otherwise
   derives a percentage from `sections`, which it already clamps at 99. */

import layout from './layout.json'

export const STORE_KEY = 'ch4:v1'

/** article order — the anchors, in the order they are read */
export const SECTION_ORDER: string[] = (layout as { sections: { id: string }[] }).sections.map((s) => s.id)

export interface Ch4Store {
  /** anchors the reader has scrolled past */
  sections: string[]
  /** the anchor last seen — the resume point */
  section?: string
  /** the article was read to the end */
  completed: boolean
}

const EMPTY: Ch4Store = { sections: [], completed: false }

export function readStore(): Ch4Store {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<Ch4Store> | null
    if (!p || typeof p !== 'object') return EMPTY
    return {
      sections: Array.isArray(p.sections) ? p.sections.filter((s): s is string => typeof s === 'string') : [],
      section: typeof p.section === 'string' ? p.section : undefined,
      completed: !!p.completed,
    }
  } catch {
    return EMPTY
  }
}

function write(store: Ch4Store): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* blocked storage must never break the chapter */
  }
}

export function saveCurrentSection(id: string): void {
  if (!SECTION_ORDER.includes(id)) return
  const store = readStore()
  if (store.section === id) return
  store.section = id
  write(store)
}

export function markSectionDone(id: string): Ch4Store {
  const store = readStore()
  if (!store.sections.includes(id)) {
    store.sections = [...store.sections, id]
    write(store)
  }
  return store
}

/** the reader reached the closing block: the CONTENT is read */
export function markContentComplete(): Ch4Store {
  const store = readStore()
  store.sections = [...SECTION_ORDER]
  store.completed = true
  write(store)
  return store
}

/** the chapter is finished only once the practice is finished */
export function markChapterComplete(): Ch4Store {
  const store = markContentComplete()
  try {
    window.localStorage.setItem('islam:chapter:4', 'done')
  } catch {
    /* blocked storage must never break the chapter */
  }
  return store
}

export function resumeSectionId(): string | null {
  const store = readStore()
  if (store.section && store.section !== SECTION_ORDER[0] && SECTION_ORDER.includes(store.section)) {
    return store.section
  }
  return null
}

export function completedSections(): string[] {
  return readStore().sections
}
