/* למצוא סימון של המחברת בתוך הטקסט של הפרק — כדי שיישאר מודגש כשחוזרים
   לפרק, וכדי שאפשר יהיה לקפוץ אליו מהמחברת.

   ⚠ ההשוואה מתעלמת מכל רווח. מה שנשמר במחברת הוא `selection.toString()`
   אחרי כיווץ רווחים, ושם בין שתי פסקאות יש ירידת שורה — בעוד שב-DOM שני
   צמתי הטקסט צמודים בלי שום רווח ביניהם ("...סוף.</p><p>התחלה"). השוואה
   שסופרת רווחים לא הייתה מוצאת אף סימון שחוצה פסקה. בלי רווחים, הסימון
   נמצא גם כשהוא חוצה <b>, מונח זהוב או קישור באמצע משפט.

   ⚠ אותו משפט יכול להופיע בפרק כמה פעמים ("השהאדה", "קרא"). לכן הסימון
   שומר `occ` — כמה מופעים של אותו נוסח קדמו לו בטקסט — ומודגש המופע
   שסומן, לא הראשון שנמצא. */

/* היכן נמצא טקסט הפרק: המאמר, ועמודי הקומיקס של פרק 3 */
export const MARK_ROOT = '.chapter-article, .c3-page'

/* מה בתוך המאמר אינו טקסט הפרק: פקדים, תפריטים, הכפתור הצף עצמו */
export const MARK_SKIP =
  'script, style, noscript, nav, button, input, textarea, select, [contenteditable], .chapter-drawer, .chapter-site-header, .nb-mark-fab'

/* רווחים, וגם הסימנים הבלתי נראים שבטקסט עברי-ערבי (כיווניות, מקף רך) —
   הדפדפן לא תמיד מעתיק אותם לבחירה */
const IGNORABLE = /[\s­​-‏‪-‮⁦-⁩﻿]/

export function markKey(text: string): string {
  let out = ''
  for (const c of text) if (!IGNORABLE.test(c)) out += c
  return out
}

interface TextIndex {
  /** כל התווים הנראים של הפרק, ברצף */
  str: string
  /** לכל תו ב-str: באיזה צומת טקסט ובאיזה היסט הוא יושב */
  node: Text[]
  off: number[]
}

function roots(selector: string): Element[] {
  const all = [...document.querySelectorAll(selector)]
  /* עמוד קומיקס בתוך המאמר של פרק 3 תואם את שני הסלקטורים — לספור פעם אחת */
  return all.filter((el) => !all.some((o) => o !== el && o.contains(el)))
}

/* הטקסט כולל גם מה שמוסתר כרגע (תיק סגור בפרק 12, קיפול סגור): טווח הוא
   חי, וההדגשה מופיעה מעצמה כשהקטע נפתח */
export function buildIndex(selector = MARK_ROOT): TextIndex {
  const idx: TextIndex = { str: '', node: [], off: [] }
  const parts: string[] = []
  for (const root of roots(selector)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement?.closest(MARK_SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    })
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      const v = n.nodeValue ?? ''
      for (let i = 0; i < v.length; i++) {
        const c = v[i]
        if (IGNORABLE.test(c)) continue
        parts.push(c)
        idx.node.push(n)
        idx.off.push(i)
      }
    }
  }
  idx.str = parts.join('')
  return idx
}

function rangeAt(idx: TextIndex, at: number, len: number): Range {
  const r = document.createRange()
  r.setStart(idx.node[at], idx.off[at])
  const last = at + len - 1
  r.setEnd(idx.node[last], idx.off[last] + 1)
  return r
}

/** כל מופעי הנוסח בפרק, לפי סדר הטקסט */
export function findAll(idx: TextIndex, key: string): number[] {
  const hits: number[] = []
  if (!key) return hits
  for (let at = idx.str.indexOf(key); at !== -1; at = idx.str.indexOf(key, at + 1)) hits.push(at)
  return hits
}

/** הטווח של סימון בפרק, או null אם הנוסח כבר לא נמצא בו */
export function rangeOfMark(idx: TextIndex, text: string, occ = 0): Range | null {
  const key = markKey(text)
  const hits = findAll(idx, key)
  if (!hits.length) return null
  const n = Number.isFinite(occ) ? Math.floor(occ) : 0
  return rangeAt(idx, hits[Math.min(Math.max(n, 0), hits.length - 1)], key.length)
}

/** איזה מופע של הנוסח הוא זה שבבחירה — כמה מופעים מתחילים לפניה */
export function occurrenceOf(idx: TextIndex, text: string, sel: Range): number {
  const hits = findAll(idx, markKey(text))
  let occ = 0
  for (const at of hits) {
    try {
      if (sel.comparePoint(idx.node[at], idx.off[at]) < 0) occ++
      else break
    } catch {
      break
    }
  }
  return Math.min(occ, Math.max(hits.length - 1, 0))
}

/* ===== CSS Custom Highlight API — טווחים שמודגשים בלי לגעת ב-DOM של React ===== */

type HighlightCtor = new (...ranges: Range[]) => { priority: number }
type Registry = { set(name: string, value: unknown): void; delete(name: string): void }

export function highlightApi(): { Highlight: HighlightCtor; highlights: Registry } | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { Highlight?: unknown; CSS?: { highlights?: unknown } }
  if (typeof w.Highlight !== 'function' || !w.CSS?.highlights) return null
  return { Highlight: w.Highlight as HighlightCtor, highlights: w.CSS.highlights as Registry }
}
