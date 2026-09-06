/* המחברת שלי — הסימונים של הלומד/ת.

   אין כאן "כתיבת הערות מאפס": המחברת מתמלאת רק ממה שסומן בפרקים עצמם
   — מסמנים משפט, לוחצים "הוספה למחברת", והוא נשמר עם הפרק שממנו הגיע.
   רק אחר כך, בתוך המחברת, אפשר לתלות הערה אישית על כל סימון בנפרד.

   הכול מקומי לדפדפן (localStorage): אין חשבון ואין שרת. */

export interface Mark {
  id: string
  /** מספר הפרק שממנו סומן */
  ch: number
  /** המשפט שסומן, כלשונו */
  text: string
  /** כותרת הסעיף שבו עמד הסימון, אם נמצאה — כדי למצוא אותו שוב */
  where?: string
  /** נסמן (epoch ms) */
  at: number
  /** ההערה האישית שנתלתה עליו במחברת */
  note?: string
  noteAt?: number
}

export interface MarksStore {
  v: 2
  marks: Mark[]
}

export const SITE_NOTEBOOK_KEY = 'site:notebook:v2'
/** נשלח על window בכל שינוי, כדי שלשוניות/עמודים פתוחים יתרעננו */
export const MARKS_EVENT = 'site-notebook-change'

const EMPTY: MarksStore = { v: 2, marks: [] }

export function readMarks(): MarksStore {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(SITE_NOTEBOOK_KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<MarksStore>
    if (!Array.isArray(p.marks)) return EMPTY
    return {
      v: 2,
      marks: p.marks.filter(
        (m): m is Mark =>
          !!m && typeof m.id === 'string' && typeof m.ch === 'number' && typeof m.text === 'string' && typeof m.at === 'number',
      ),
    }
  } catch {
    return EMPTY
  }
}

function write(store: MarksStore): MarksStore {
  try {
    window.localStorage.setItem(SITE_NOTEBOOK_KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent(MARKS_EVENT))
  } catch {
    /* דפדפן שחוסם אחסון — הסימון עדיין מוצג עד רענון */
  }
  return store
}

/** אורך מקסימלי לסימון בודד — בחירה ענקית בטעות לא תשתלט על המחברת */
const MAX_LEN = 1200

export function addMark(ch: number, text: string, where?: string): Mark | null {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
  if (!clean) return null
  const s = readMarks()
  /* אותו משפט מאותו פרק לא נשמר פעמיים */
  const dup = s.marks.find((m) => m.ch === ch && m.text === clean)
  if (dup) return dup
  const mark: Mark = { id: Math.random().toString(36).slice(2, 9) + Date.now().toString(36), ch, text: clean, where, at: Date.now() }
  write({ ...s, marks: [...s.marks, mark] })
  return mark
}

export function setMarkNote(id: string, note: string): MarksStore {
  const s = readMarks()
  const text = note.trim()
  return write({
    ...s,
    marks: s.marks.map((m) => (m.id === id ? { ...m, note: text || undefined, noteAt: text ? Date.now() : undefined } : m)),
  })
}

export function deleteMark(id: string): MarksStore {
  const s = readMarks()
  return write({ ...s, marks: s.marks.filter((m) => m.id !== id) })
}

export function marksInChapter(ch: number): Mark[] {
  return readMarks().marks.filter((m) => m.ch === ch)
}
