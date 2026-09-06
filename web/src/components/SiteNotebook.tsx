'use client'

/* המחברת שלי — עמוד המחברת האישית של האתר. נפתחת מהתפריט (ליד חדר
   המבחנים): מסמנים ושומרים דברים לעצמכם, מסודר לפי פרקים. מקומי
   לדפדפן; אין שרת. העיצוב יושב על שפת הקלף של מסך הפרקים. */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { allChapters } from '@/lib/chapters-data'
import {
  addSiteNote,
  deleteSiteNote,
  editSiteNote,
  readSiteNotebook,
  type SiteNotebookStore,
} from '@/lib/site-notebook'

const GENERAL = 0

function fmt(ms: number): string {
  return new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SiteNotebook() {
  const [store, setStore] = useState<SiteNotebookStore>({ v: 1, notes: [] })
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  /* localStorage נקרא רק אחרי ההרכבה — העמוד עובר prerender בשרת */
  useEffect(() => {
    const s = readSiteNotebook()
    setStore(s)
    /* פרקים שכבר יש בהם הערות נפתחים מעצמם — קודם מה ששלך */
    setOpen(new Set(s.notes.map((n) => n.ch)))
    setReady(true)
  }, [])

  const byChapter = useMemo(() => {
    const m = new Map<number, SiteNotebookStore['notes']>()
    for (const n of store.notes) {
      const list = m.get(n.ch) ?? []
      list.push(n)
      m.set(n.ch, list)
    }
    for (const list of m.values()) list.sort((a, b) => a.at - b.at)
    return m
  }, [store])

  const sections = useMemo(
    () => [
      { ch: GENERAL, title: 'הערות כלליות', sub: 'מה שלא שייך לפרק אחד' },
      ...allChapters.map((c) => ({ ch: c.number, title: c.title, sub: `פרק ${c.number}` })),
    ],
    [],
  )

  const toggle = (ch: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(ch)) next.delete(ch)
      else next.add(ch)
      return next
    })

  const save = (ch: number) => {
    const text = (draft[ch] ?? '').trim()
    if (!text) return
    setStore(addSiteNote(ch, text))
    setDraft((d) => ({ ...d, [ch]: '' }))
  }

  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim()
    if (text) setStore(editSiteNote(editing.id, text))
    setEditing(null)
  }

  const total = store.notes.length

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hdr">
        <Link className="nb-back" href="/chapters" aria-label="חזרה לפרקי הלמידה">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span>פרקי הלמידה</span>
        </Link>
        <div className="nb-title">
          <h1>המחברת שלי</h1>
          <p>{ready && total > 0 ? `${total} הערות, שמורות כאן בדפדפן שלכם` : 'סמנו ושמרו לעצמכם — לפי פרקים. נשמר בדפדפן הזה בלבד.'}</p>
        </div>
      </header>

      <main className="nb-body">
        {sections.map((sec) => {
          const notes = byChapter.get(sec.ch) ?? []
          const isOpen = open.has(sec.ch)
          return (
            <section key={sec.ch} className={`nb-sec${isOpen ? ' is-open' : ''}${notes.length ? ' has-notes' : ''}`}>
              <button type="button" className="nb-sec-head" aria-expanded={isOpen} onClick={() => toggle(sec.ch)}>
                <span className="nb-sec-sub">{sec.sub}</span>
                <span className="nb-sec-name">{sec.title}</span>
                {notes.length > 0 && <span className="nb-count">{notes.length}</span>}
                <svg className="nb-chev" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isOpen && (
                <div className="nb-sec-body">
                  {notes.map((n) =>
                    editing?.id === n.id ? (
                      <div className="nb-note is-editing" key={n.id}>
                        <textarea
                          value={editing.text}
                          rows={3}
                          autoFocus
                          onChange={(e) => setEditing({ id: n.id, text: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit()
                            if (e.key === 'Escape') setEditing(null)
                          }}
                        />
                        <div className="nb-note-actions">
                          <button type="button" className="nb-btn" onClick={saveEdit}>שמירה</button>
                          <button type="button" className="nb-btn is-quiet" onClick={() => setEditing(null)}>ביטול</button>
                        </div>
                      </div>
                    ) : (
                      <div className="nb-note" key={n.id}>
                        <p>{n.text}</p>
                        <div className="nb-note-meta">
                          <span>{fmt(n.up ?? n.at)}{n.up ? ' · נערכה' : ''}</span>
                          <span className="nb-note-tools">
                            <button type="button" className="nb-tool" onClick={() => { setConfirmDel(null); setEditing({ id: n.id, text: n.text }) }}>
                              עריכה
                            </button>
                            {confirmDel === n.id ? (
                              <button
                                type="button"
                                className="nb-tool is-danger"
                                onClick={() => { setStore(deleteSiteNote(n.id)); setConfirmDel(null) }}
                              >
                                למחוק באמת?
                              </button>
                            ) : (
                              <button type="button" className="nb-tool" onClick={() => setConfirmDel(n.id)}>
                                מחיקה
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                  <div className="nb-compose">
                    <textarea
                      placeholder={sec.ch === GENERAL ? 'הערה חדשה…' : `הערה על ${sec.sub}…`}
                      rows={2}
                      value={draft[sec.ch] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [sec.ch]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(sec.ch)
                      }}
                    />
                    <button type="button" className="nb-btn" disabled={!(draft[sec.ch] ?? '').trim()} onClick={() => save(sec.ch)}>
                      הוספה
                    </button>
                  </div>
                </div>
              )}
            </section>
          )
        })}
        <p className="nb-foot">
          המחברת נשמרת בדפדפן הזה בלבד — היא לא עולה לשום שרת. ניקוי נתוני האתר בדפדפן ימחק אותה.
        </p>
      </main>
    </div>
  )
}
