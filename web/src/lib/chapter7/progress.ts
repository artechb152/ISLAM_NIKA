/* Scroll-progress persistence for chapter 7 — the same discipline as chapter 6:
   a versioned key, a section is credited only when the reader scrolls PAST it,
   and reaching the closing block hands the chapter over to its practice.

   `islam:chapter:7 = 'done'` is written by the practice page and by nowhere
   else, exactly as chapter 6 does it: finishing the reading is not finishing
   the chapter. The chapters screen reads the flag for 100% and otherwise
   derives a percentage from `sections`, which it already clamps at 99. */

import layout from './layout.json'

/* v2: v1 was written by the journey build (11.10), whose "sections" were twelve months */
export const STORE_KEY = 'ch7:v2'

/** article order — the anchors, in the order they are read */
export const SECTION_ORDER: string[] = (layout as { sections: { id: string }[] }).sections.map((s) => s.id)

export interface Ch7Store {
  /** anchors the reader has scrolled past */
  sections: string[]
  /** the anchor last seen — the resume point */
  section?: string
  /** the article was read to the end */
  completed: boolean
}

const EMPTY: Ch7Store = { sections: [], completed: false }

export function readStore(): Ch7Store {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<Ch7Store> | null
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

function write(store: Ch7Store): void {
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

export function markSectionDone(id: string): Ch7Store {
  const store = readStore()
  if (!store.sections.includes(id)) {
    store.sections = [...store.sections, id]
    write(store)
  }
  return store
}

/** the reader reached the closing block: the CONTENT is read */
export function markContentComplete(): Ch7Store {
  const store = readStore()
  store.sections = [...SECTION_ORDER]
  store.completed = true
  write(store)
  return store
}

/** the chapter is finished only once the practice is finished */
export function markChapterComplete(): Ch7Store {
  const store = markContentComplete()
  try {
    window.localStorage.setItem('islam:chapter:7', 'done')
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

/* Has the closing practice been finished? The practice keeps its boards in
   `ch7:practice:v1`, but the signal read here is the flag it writes when the last
   question is solved — `markChapterComplete()` above, and nowhere else.

   `readStore().completed` is NOT that signal and must never be used for it: it is
   set by reaching the closing block, i.e. by finishing the READING.

   CROSS-FILE CONTRACT: Chapter7.tsx reads this to decide whether its closing
   button carries the „הושלם" chip. It never gates entry to the practice. */
export function practiceComplete(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('islam:chapter:7') === 'done'
  } catch {
    return false
  }
}
