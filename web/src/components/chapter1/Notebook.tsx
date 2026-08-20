'use client'

/* מחברת המסע — the chapter's only artefact. Rawi writes it, so it contains
   exactly what was heard and nothing else: every paragraph here is a line from
   dialogue.json that the player played to the end, carrying the §N of the
   source passage it paraphrases. There is no score, no failure and no summary
   written for the occasion — a sentence the player never heard must never
   appear on this page. */

import { useEffect, useMemo, useState } from 'react'
import {
  NOTEBOOK_TOTAL,
  PORTRAIT,
  SPEAKERS,
  journal,
  verses,
  type JournalEntry,
  type SpeakerId,
  type VerseEntry,
} from '@/lib/chapter1/dialogue'
import { FINDS, FINDS_TOTAL } from '@/lib/chapter1/finds'
import { TASKS, TASKS_TOTAL } from '@/lib/chapter1/tasks'

type Tab = 'all' | 'region' | 'speaker' | 'verses' | 'finds'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'הכול' },
  { id: 'region', label: 'לפי אזור' },
  { id: 'speaker', label: 'לפי דמות' },
  { id: 'verses', label: 'פסוקים' },
  { id: 'finds', label: 'עדויות' },
]

function Face({ who }: { who: SpeakerId }) {
  const src = PORTRAIT[who]
  if (!src) return <span className="nb-face nb-face-narrator" aria-hidden>״</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="nb-face" src={src} alt="" />
}

/** One heard encounter, written out in full. */
function Card({ entry }: { entry: JournalEntry }) {
  const e = entry.encounter
  const followup = e.rawi_followup ?? []
  const sources = [...e.lines, ...followup].map((l) => l.source)
  const uniqueSources = [...new Set(sources)]
  return (
    <article className="nb-card">
      <Face who={e.speaker} />
      <div className="nb-card-body">
        <p className="nb-who">
          {SPEAKERS[e.speaker]}
          <span className="nb-where"> · {entry.regionName}</span>
        </p>
        {e.lines.map((l, i) => (
          <p key={i} className={'nb-txt' + (l.verse ? ' is-verse' : '')}>
            {l.text}
          </p>
        ))}
        {followup.length > 0 && (
          <p className="nb-rawi">
            <b>רָאוִי מחדד:</b>{' '}
            {followup.map((l) => l.text).join(' ')}
          </p>
        )}
        <p className="nb-src">{uniqueSources.join(' · ')}</p>
      </div>
    </article>
  )
}

function VerseCard({ entry }: { entry: VerseEntry }) {
  return (
    <article className="nb-card is-verse-card">
      <Face who={entry.encounter.speaker} />
      <div className="nb-card-body">
        <p className="nb-who">
          {SPEAKERS[entry.encounter.speaker]}
          <span className="nb-where"> · {entry.regionName}</span>
        </p>
        <p className="nb-txt is-verse">{entry.line.text}</p>
        <p className="nb-src">{entry.line.source}</p>
      </div>
    </article>
  )
}

function Group({ title, entries }: { title: string; entries: JournalEntry[] }) {
  return (
    <section className="nb-group">
      <h3 className="nb-group-title">{title}</h3>
      <div className="nb-grid">
        {entries.map((entry) => (
          <Card key={entry.encounter.id} entry={entry} />
        ))}
      </div>
    </section>
  )
}

export function Notebook({ seen, found, solved, onClose }: {
  seen: string[]
  /** ids of the evidence examined so far — see finds.ts */
  found: string[]
  /** ids of the region tasks worked out — see tasks.ts */
  solved: string[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('all')
  const entries = useMemo(() => journal(seen), [seen])
  const verseEntries = useMemo(() => verses(seen), [seen])

  /* Grouping keeps journey order: a Map preserves insertion order, and the
     journal already comes out in the order the road runs. */
  const byRegion = useMemo(() => {
    const m = new Map<string, JournalEntry[]>()
    for (const e of entries) m.set(e.regionName, [...(m.get(e.regionName) ?? []), e])
    return [...m.entries()]
  }, [entries])

  const bySpeaker = useMemo(() => {
    const m = new Map<SpeakerId, JournalEntry[]>()
    for (const e of entries) {
      const who = e.encounter.speaker
      m.set(who, [...(m.get(who) ?? []), e])
    }
    return [...m.entries()]
  }, [entries])

  const filled = useMemo(() => new Set(entries.map((e) => e.encounter.notebook)).size, [entries])

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const empty = entries.length === 0

  /* Evidence and tasks are notebook entries too — Rawi writes down what you
     picked up off the ground just as he writes down what somebody said. Kept on
     their own page because they are a different kind of knowing: a conversation
     is a person's account, and a coin is a coin. */
  const foundEntries = useMemo(() => FINDS.filter((f) => found.includes(f.id)), [found])
  const solvedEntries = useMemo(() => TASKS.filter((t) => solved.includes(t.id)), [solved])

  return (
    <div
      className="ch1-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="מחברת המסע"
      onPointerDown={(ev) => ev.stopPropagation()}
    >
      <div className="ch1-overlay-scrim" onClick={onClose} />
      <div className="nb-page">
        <header className="nb-head">
          <h2 className="nb-title">מחברת המסע</h2>
          <nav className="nb-tabs" aria-label="מיון המחברת">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={'nb-tab' + (tab === t.id ? ' is-on' : '')}
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="nb-body">
          {empty && tab !== 'finds' && (
            <p className="nb-empty">
              המחברת עדיין ריקה. דברו עם רָאוִי (<i className="hud-key">R</i>) ועם מי שתפגשו בדרך
              (<i className="hud-key">E</i>) — כל מה שייאמר נרשם כאן מעצמו.
            </p>
          )}

          {!empty && tab === 'all' && (
            <div className="nb-grid">
              {entries.map((entry) => (
                <Card key={entry.encounter.id} entry={entry} />
              ))}
            </div>
          )}

          {!empty && tab === 'region' &&
            byRegion.map(([region, list]) => <Group key={region} title={region} entries={list} />)}

          {!empty && tab === 'speaker' &&
            bySpeaker.map(([who, list]) => <Group key={who} title={SPEAKERS[who]} entries={list} />)}

          {tab === 'finds' && (
            <>
              <section className="nb-group">
                <h3 className="nb-group-title">
                  עדויות שנאספו · {foundEntries.length} מתוך {FINDS_TOTAL}
                </h3>
                {foundEntries.length ? (
                  <div className="nb-grid">
                    {foundEntries.map((f) => (
                      <article key={f.id} className="nb-card">
                        <p className="nb-find-src">{f.source}</p>
                        <h4 className="nb-find-title">{f.title}</h4>
                        <p className="nb-find-text">{f.body}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="nb-empty">
                    עוד לא נאספה עדות. חפצים שאפשר להביט בהם מקרוב מסומנים בנקודת זהב — F.
                  </p>
                )}
              </section>
              {solvedEntries.length > 0 && (
                <section className="nb-group">
                  <h3 className="nb-group-title">
                    מה שנפתר בדרך · {solvedEntries.length} מתוך {TASKS_TOTAL}
                  </h3>
                  <div className="nb-grid">
                    {solvedEntries.map((t) => (
                      <article key={t.id} className="nb-card">
                        <p className="nb-find-src">{t.source}</p>
                        <h4 className="nb-find-title">{t.title}</h4>
                        <p className="nb-find-text">{t.done}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {!empty && tab === 'verses' && (
            verseEntries.length ? (
              <div className="nb-grid">
                {verseEntries.map((entry, i) => (
                  <VerseCard key={`${entry.encounter.id}-${i}`} entry={entry} />
                ))}
              </div>
            ) : (
              <p className="nb-empty">עוד לא נשמע פסוק מהקוראן במסע.</p>
            )
          )}
        </div>

        <footer className="nb-foot">
          <span>
            נרשמו {filled} מתוך {NOTEBOOK_TOTAL} רשומות · עדויות {foundEntries.length} מתוך {FINDS_TOTAL}
          </span>
          <button type="button" className="nb-close" onClick={onClose}>
            <i className="hud-key">J</i> לסגירה
          </button>
        </footer>
      </div>
    </div>
  )
}
