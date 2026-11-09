'use client'

/* "הוספה למחברת" — הכפתור הקטן שצץ כשמסמנים משפט בתוך פרק, וההדגשה
   שנשארת על מה שכבר סומן.

   מרכיבים אותו פעם אחת בעמוד הפרק עם מספר הפרק. הוא מקשיב לבחירת
   טקסט; אם היא נופלת בתוך הטקסט של הפרק (ולא בתפריט/כותרת), הוא מציג
   כפתור צף ליד הבחירה. לחיצה שומרת את המשפט במחברת עם הפרק שממנו בא
   וכותרת הסעיף שבו עמד. אין כאן כתיבה — רק סימון.

   ⚠ הבחירה נקראת מ-`selectionchange`, לא רק מ-mouseup/touchend. בטלפון
   בחירה נעשית בלחיצה ארוכה ובגרירת הידיות של הדפדפן — הלחיצה הארוכה מסתיימת
   ב-touchcancel ולא ב-touchend, והידיות לא שולחות לעמוד שום אירוע מגע.
   כשהכפתור הקשיב רק ל-touchend הוא פשוט לא הופיע בטלפון.

   ⚠ גלילה מזיזה את הכפתור ולא מעלימה אותו. הוא נעלם בכל אירוע scroll, וכמה
   פרקים גוללים את עצמם מעט אחרי שהעמוד נח (תמונות שנטענות, עיגון גלילה) —
   בפרק 14 הכפתור נעלם כשנייה אחרי שהופיע, עוד לפני שאפשר היה ללחוץ עליו.

   ההדגשה: כל מה שסומן בפרק הזה מודגש בטקסט (CSS Custom Highlight API —
   טווחים שמצוירים בלי לגעת ב-DOM ש-React מחזיק). מתעדכנת מיד אחרי סימון,
   כשמוחקים במחברת (גם בלשונית אחרת, וגם כשחוזרים ב"אחורה" מה-bfcache),
   וכשהפרק מחליף תוכן. דפדפן בלי ה-API פשוט לא מדגיש — הסימון עצמו עובד.

   הסרה (המשתמשת, 9.11.2026: „שיהיה אופציה גם להוציא מהמחברת ע"י סימון של אותו
   המשפט"): בחירה שנוגעת בקטע שכבר מודגש מציגה „הסרה מהמחברת" במקום „הוספה" —
   ולחיצה מוציאה את כל הסימונים שהבחירה נוגעת בהם. סימון שיש לו הערה אומר זאת על
   הכפתור, כי ההערה יוצאת יחד איתו.

   הערה מיד (המשתמשת, אותו יום: „שיהיה אופציה להוסיף הערה ישר אחרי סימון"): אחרי
   „נוסף למחברת" הכפתור נשאר עוד רגע עם „הוספת הערה"; לחיצה פותחת תיבה קטנה במקום,
   וההערה נשמרת על הסימון — אותה הערה שרואים ועורכים במחברת. מי שמתעלם — הכפתור יורד
   לבד כמו קודם. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { addMark, deleteMark, setMarkNote, GOTO_PARAM, marksInChapter, MARKS_EVENT, SITE_NOTEBOOK_KEY } from '@/lib/site-notebook'
import { buildIndex, highlightApi, MARK_ROOT, MARK_SKIP, occurrenceOf, rangeOfMark } from '@/lib/site-notebook-find'

const HL = 'nb-mark'
const HL_FOCUS = 'nb-mark-focus'

type At = { x: number; top: number; bottom: number }

/* a < b בסדר המסמך */
function before(aNode: Node, aOff: number, bNode: Node, bOff: number): boolean {
  const r = document.createRange()
  r.setStart(aNode, aOff)
  return r.comparePoint(bNode, bOff) === 1
}
/* שני טווחים חופפים: כל אחד מתחיל לפני שהשני נגמר */
function overlaps(a: Range, b: Range): boolean {
  try {
    return before(a.startContainer, a.startOffset, b.endContainer, b.endOffset) && before(b.startContainer, b.startOffset, a.endContainer, a.endOffset)
  } catch {
    return false
  }
}

/* ברירת המחדל מכסה את שני מבני הפרקים: המאמר (.chapter-article) והקומיקס
   של פרק 3 (.c3-page). אפשר לדרוס עם prop לפרק בעל מבנה משלו. */
export default function MarkToNotebook({ ch, root = MARK_ROOT }: { ch: number; root?: string }) {
  const [at, setAt] = useState<At | null>(null)
  const [saved, setSaved] = useState<'' | 'added' | 'removed'>('')
  /* הסימונים שהבחירה הנוכחית נוגעת בהם — אם יש, הכפתור מסיר */
  const [hits, setHits] = useState<{ ids: string[]; noted: boolean }>({ ids: [], noted: false })
  /* הטווחים של מה שמודגש עכשיו, מה-paint — כדי לדעת אם בחירה נופלת על סימון */
  const painted = useRef<Map<string, Range>>(new Map())
  /* הסימון שנוסף עכשיו, והתיבה של ההערה עליו */
  const [addedId, setAddedId] = useState<string | null>(null)
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState('')
  const [noted, setNoted] = useState(false)
  const closeTimer = useRef(0)
  const [touch, setTouch] = useState(false)
  const pending = useRef<{ text: string; where?: string; occ: number; range: Range } | null>(null)
  const fab = useRef<HTMLDivElement | null>(null)
  /* אחרי "נוסף למחברת" הבחירה מתבטלת — וזה לא סיבה להעלים את האישור */
  const holdUntil = useRef(0)

  const hide = useCallback(() => {
    if (Date.now() < holdUntil.current) return
    setAt(null)
    setSaved('')
    setHits({ ids: [], noted: false })
    setAddedId(null)
    setNoting(false)
    setNote('')
    setNoted(false)
    pending.current = null
  }, [])

  /* ---------- הבחירה והכפתור ---------- */
  useEffect(() => {
    let mouseDown = false
    let timer = 0
    let raf = 0

    const evaluate = () => {
      const sel = window.getSelection()
      const text = sel?.toString() ?? ''
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || text.trim().length < 2) return hide()
      const node = sel.anchorNode
      const el = (node?.nodeType === 1 ? (node as Element) : node?.parentElement) ?? null
      if (!el || !el.closest(root) || el.closest(MARK_SKIP)) return hide()
      const range = sel.getRangeAt(0).cloneRange()
      const rect = range.getBoundingClientRect()
      if (!rect || (rect.width === 0 && rect.height === 0)) return hide()
      /* איפה זה עמד — הכותרת של הסעיף */
      const section = el.closest('section, .article-section')
      const head = section?.querySelector('h2, h3')
      let occ = 0
      try {
        occ = occurrenceOf(buildIndex(root), text, range)
      } catch {
        /* מופע ראשון — עדיף על סימון שלא נשמר */
      }
      holdUntil.current = 0
      pending.current = { text, where: head?.textContent?.trim() || undefined, occ, range }
      const ids = [...painted.current].filter(([, r]) => overlaps(range, r)).map(([id]) => id)
      const notes = new Set(marksInChapter(ch).filter((m) => m.note).map((m) => m.id))
      setHits({ ids, noted: ids.some((id) => notes.has(id)) })
      setSaved('')
      setAt({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom })
    }
    const schedule = (ms: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(evaluate, ms)
    }
    const onFab = (e: Event) => !!fab.current && e.target instanceof Node && fab.current.contains(e.target)

    const onDown = (e: PointerEvent) => {
      if (onFab(e)) return
      setTouch(e.pointerType !== 'mouse')
      if (e.pointerType === 'mouse') mouseDown = true
    }
    const onUp = (e: Event) => {
      if (onFab(e)) return
      mouseDown = false
      schedule(10)
    }
    /* בזמן גרירה בעכבר הבחירה משתנה בכל פיקסל — נקראת רק כשמשחררים.
       ידיות מגע ו-Shift+חצים מגיעים לכאן בלבד, ונקראים כשהבחירה נחה. */
    const onSelection = () => {
      if (!mouseDown) schedule(320)
    }
    /* הכפתור נצמד לבחירה כשהעמוד זז, ויורד כשהיא יוצאת מהמסך */
    const follow = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const p = pending.current
        if (!p || Date.now() < holdUntil.current) return
        const r = p.range.getBoundingClientRect()
        if ((r.width === 0 && r.height === 0) || r.bottom < 0 || r.top > window.innerHeight) {
          setAt(null)
          return
        }
        setAt({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
      })
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)
    document.addEventListener('selectionchange', onSelection)
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchend', onUp)
      document.removeEventListener('selectionchange', onSelection)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [root, hide, ch])

  /* ---------- ההדגשה של מה שכבר סומן ---------- */
  useEffect(() => {
    const api = highlightApi()
    let goto = new URLSearchParams(window.location.search).get(GOTO_PARAM)
    const found = new Map<string, Range>()
    let timer = 0
    let flash = 0

    const paint = () => {
      timer = 0
      found.clear()
      const marks = marksInChapter(ch)
      if (marks.length) {
        let idx: ReturnType<typeof buildIndex> | null = null
        try {
          idx = buildIndex(root)
        } catch {
          idx = null
        }
        if (idx) {
          for (const m of marks) {
            const r = rangeOfMark(idx, m.text, m.occ)
            if (r) found.set(m.id, r)
          }
        }
      }
      painted.current = new Map(found)
      if (api) {
        if (found.size) {
          const h = new api.Highlight(...found.values())
          /* החיפוש בפרק (chapter-find) מצויר מעל הסימונים, לא מתחתם */
          h.priority = -1
          api.highlights.set(HL, h)
        } else api.highlights.delete(HL)
      }
      /* הקפיצה מחכה לעמוד שנטען — תמונות שנטענות אחריה היו מזיזות אותה */
      if (goto && found.has(goto) && document.readyState === 'complete') {
        const id = goto
        goto = null
        go(found.get(id)!)
      }
    }
    const later = () => {
      if (!timer) timer = window.setTimeout(paint, 350)
    }

    /* "לקטע בפרק" מהמחברת: לגלול אל הסימון ולהאיר אותו רגע */
    const go = (range: Range, tries = 0) => {
      const node = range.startContainer
      const el = node.nodeType === 1 ? (node as Element) : node.parentElement
      if (!el) return
      if (!range.getClientRects().length && tries < 2) {
        /* הסימון בתוך מסך מוסתר עם id (תיק בפרק 12) — פותחים אותו כמו
           שהסרגל פותח אותו, ב-hash, ומנסים שוב */
        for (let a: Element | null = el; a; a = a.parentElement) {
          if (a.id && getComputedStyle(a).display === 'none') {
            window.location.hash = a.id
            break
          }
        }
        window.setTimeout(() => go(range, tries + 1), 450)
        return
      }
      const center = () => {
        const r = range.getBoundingClientRect()
        window.scrollBy({ top: r.top + r.height / 2 - window.innerHeight * 0.4, behavior: 'instant' as ScrollBehavior })
      }
      center()
      /* תמונות שנטענות מעל מזיזות את הטקסט — תיקון אחד אחרי שהעמוד נח */
      window.setTimeout(() => {
        const r = range.getBoundingClientRect()
        if (r.top < 60 || r.bottom > window.innerHeight - 40) center()
      }, 900)
      if (api) {
        api.highlights.set(HL_FOCUS, new api.Highlight(range))
        window.clearTimeout(flash)
        flash = window.setTimeout(() => api.highlights.delete(HL_FOCUS), 2600)
      }
      const u = new URL(window.location.href)
      u.searchParams.delete(GOTO_PARAM)
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash)
    }

    const start = () => paint()
    paint()
    if (document.readyState !== 'complete') window.addEventListener('load', start, { once: true })
    /* פרמטר שלא נמצא לו סימון (נמחק בינתיים) לא נשאר בכתובת */
    const drop = window.setTimeout(() => {
      if (!goto) return
      goto = null
      const u = new URL(window.location.href)
      u.searchParams.delete(GOTO_PARAM)
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash)
    }, 8000)

    const touchesText = (n: Node) =>
      n.nodeType === 3 ? !!n.parentElement?.closest(root) : n.nodeType === 1 && (!!(n as Element).closest(root) || !!(n as Element).querySelector(root))
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SITE_NOTEBOOK_KEY) paint()
    }
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) paint()
    }
    /* React מחליף צמתי טקסט (תיק נפתח, קיפול, טעינה מאוחרת) והטווחים נשארים
       על הישנים — מחשבים מחדש, אבל רק על שינוי בתוך טקסט הפרק */
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        const t = m.target.nodeType === 1 ? (m.target as Element) : m.target.parentElement
        if (!t || t.closest('.nb-mark-fab')) continue
        /* שינוי בתוך הטקסט, או מאמר שלם שנכנס/יצא */
        if (t.closest(root) || [...m.addedNodes, ...m.removedNodes].some(touchesText)) return later()
      }
    })
    mo.observe(document.body, { childList: true, subtree: true, characterData: true })
    window.addEventListener(MARKS_EVENT, paint)
    window.addEventListener('storage', onStorage)
    window.addEventListener('pageshow', onShow)
    return () => {
      mo.disconnect()
      window.clearTimeout(timer)
      window.clearTimeout(flash)
      window.clearTimeout(drop)
      window.removeEventListener('load', start)
      window.removeEventListener(MARKS_EVENT, paint)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pageshow', onShow)
      api?.highlights.delete(HL)
      api?.highlights.delete(HL_FOCUS)
    }
  }, [ch, root])

  /* הכפתור יורד אחרי ms — אלא אם בינתיים פתחו את תיבת ההערה */
  const closeIn = (ms: number) => {
    holdUntil.current = Date.now() + ms
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      holdUntil.current = 0
      hide()
    }, ms)
  }

  const save = () => {
    const p = pending.current
    if (!p) return
    window.getSelection()?.removeAllRanges()
    if (hits.ids.length) {
      for (const id of hits.ids) deleteMark(id)
      setSaved('removed')
      closeIn(1250)
      return
    }
    const m = addMark(ch, p.text, p.where, p.occ)
    setSaved('added')
    setAddedId(m?.id ?? null)
    /* זמן לראות את „הוספת הערה" וללחוץ עליו */
    closeIn(m ? 4500 : 1250)
  }

  const openNote = () => {
    window.clearTimeout(closeTimer.current)
    /* בזמן הקלדה הבחירה בעמוד משתנה — היא לא סיבה לסגור את התיבה */
    holdUntil.current = Number.MAX_SAFE_INTEGER
    setNoting(true)
  }
  const saveNote = () => {
    if (addedId && note.trim()) {
      setMarkNote(addedId, note)
      setNoted(true)
    }
    setNoting(false)
    closeIn(note.trim() ? 1250 : 1)
  }

  if (!at) return null

  /* בעכבר הכפתור מעל הבחירה. במגע — מתחתיה: מעליה הדפדפן פותח את תפריט
     ההעתקה שלו, והיה מכסה את הכפתור */
  const x = Math.min(Math.max(at.x, 96), window.innerWidth - 96)
  const top = touch
    ? at.bottom + 78 < window.innerHeight
      ? at.bottom + 30
      : Math.max(at.top - 100, 8)
    : at.top > 64
      ? at.top - 46
      : at.bottom + 12

  return (
    <div
      ref={fab}
      className={`nb-mark-fab${saved ? ' is-saved' : ''}${hits.ids.length && !saved ? ' is-remove' : ''}`}
      style={{ left: x, top }}
      role="status"
      onMouseDown={(e) => {
        /* שומר על הבחירה בעמוד — אבל לא בתוך תיבת ההערה, שצריכה סמן */
        if (!(e.target instanceof HTMLTextAreaElement)) e.preventDefault()
      }}
    >
      {noting ? (
        <div className="nb-mark-note">
          <textarea
            autoFocus
            rows={3}
            value={note}
            placeholder="ההערה שלי על המשפט…"
            aria-label="הערה על המשפט שסומן"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setNote(''); saveNote() }
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveNote()
            }}
          />
          <div className="nb-mark-note-actions">
            <button type="button" className="is-primary" onClick={saveNote}>
              שמירת ההערה
            </button>
            <button type="button" onClick={() => { setNote(''); setNoting(false); closeIn(1) }}>
              בלי הערה
            </button>
          </div>
        </div>
      ) : saved ? (
        <span className="nb-mark-done">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
          {saved === 'removed' ? 'הוסר מהמחברת' : noted ? 'ההערה נשמרה' : 'נוסף למחברת'}
          {saved === 'added' && addedId && !noted && (
            <button type="button" className="nb-mark-addnote" onClick={openNote}>
              הוספת הערה
            </button>
          )}
        </span>
      ) : hits.ids.length ? (
        <button type="button" onClick={save}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1ZM9.5 10.5h5" />
          </svg>
          {hits.noted ? 'הסרה מהמחברת (גם ההערה)' : 'הסרה מהמחברת'}
        </button>
      ) : (
        <button type="button" onClick={save}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />
          </svg>
          הוספה למחברת
        </button>
      )}
    </div>
  )
}
