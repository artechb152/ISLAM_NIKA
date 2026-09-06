/* המחברת האישית של האתר — הערות חופשיות שהלומדים כותבים לעצמם,
   מסודרות לפי פרקים. הכול נשמר מקומית בדפדפן (localStorage): אין
   חשבון ואין שרת — המחברת היא של הקוראת בלבד. */

export interface SiteNote {
  id: string
  /** מספר פרק 1..16, או 0 להערה כללית */
  ch: number
  text: string
  /** נכתבה (epoch ms) */
  at: number
  /** נערכה לאחרונה, אם נערכה */
  up?: number
}

export interface SiteNotebookStore {
  v: 1
  notes: SiteNote[]
}

export const SITE_NOTEBOOK_KEY = 'site:notebook:v1'

const EMPTY: SiteNotebookStore = { v: 1, notes: [] }

export function readSiteNotebook(): SiteNotebookStore {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(SITE_NOTEBOOK_KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<SiteNotebookStore>
    if (!Array.isArray(p.notes)) return EMPTY
    return {
      v: 1,
      notes: p.notes.filter(
        (n): n is SiteNote =>
          !!n && typeof n.id === 'string' && typeof n.ch === 'number' && typeof n.text === 'string' && typeof n.at === 'number',
      ),
    }
  } catch {
    return EMPTY
  }
}

function write(store: SiteNotebookStore): SiteNotebookStore {
  try {
    window.localStorage.setItem(SITE_NOTEBOOK_KEY, JSON.stringify(store))
  } catch {
    /* דפדפן שחוסם אחסון — המחברת עדיין עובדת בזיכרון עד רענון */
  }
  return store
}

export function addSiteNote(ch: number, text: string): SiteNotebookStore {
  const s = readSiteNotebook()
  const note: SiteNote = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), ch, text, at: Date.now() }
  return write({ ...s, notes: [...s.notes, note] })
}

export function editSiteNote(id: string, text: string): SiteNotebookStore {
  const s = readSiteNotebook()
  return write({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, text, up: Date.now() } : n)) })
}

export function deleteSiteNote(id: string): SiteNotebookStore {
  const s = readSiteNotebook()
  return write({ ...s, notes: s.notes.filter((n) => n.id !== id) })
}
