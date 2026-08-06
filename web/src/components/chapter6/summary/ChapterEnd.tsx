'use client'

/* Screen 30 — the chapter's close.

   The five commandments, full, with one short memory line under each that summarises its topic
   without replacing it. Clicking one returns to that topic in the article. A central button
   ends the chapter. If there were mistakes, a focused return is offered — and only then.

   THE VERBS COME BACK HERE, and only here: as the chapter's own sentence, Muhammad's answer to
   „מהו האסלאם?“ (drawerContent[2]), read rather than operated. That is the right place for
   them — a sentence to finish on, not an interface to work.

   No score: the spec is explicit — „לא להציג ציון מספרי אלא סטטוס השלמה ומשוב ממוקד“. */

import Link from 'next/link'
import { END, PILLARS, PILLAR_NAME, type PillarKey } from '@/lib/chapter6/summary-data'

export default function ChapterEnd({
  missed,
  onReset,
  confirmReset,
  onAskReset,
  onCancelReset,
}: {
  /* the commandments that took a wrong attempt along the way — for the focused return */
  missed: PillarKey[]
  onReset: () => void
  confirmReset: boolean
  onAskReset: () => void
  onCancelReset: () => void
}) {
  return (
    <section className="gv-end" aria-labelledby="gv-end-t">
      <h2 id="gv-end-t">{END.title}</h2>
      <div className="title-ornament" aria-hidden="true">
        <span />
      </div>
      <p className="gv-end-lead">{END.lead}</p>

      <ul className="gv-end-frieze">
        {PILLARS.map((p) => (
          <li key={p.key}>
            <Link className="gv-end-pillar" href={p.anchor}>
              <span className="gv-end-ico" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/anim-video/${p.icon}`} alt="" />
              </span>
              <b>{p.name}</b>
              <span className="gv-end-memory">{END.memory[p.key]}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Not gold-framed. `.shahada-quote` is the chapter's ONE illuminated frame and it is
          already spent twice on this page — the testimony at the centre of the shahada exercise
          and the pilgrimage clause in the closing. A third would make a rare thing ordinary,
          which is the mistake this whole page was rebuilt to undo. */}
      <figure className="gv-end-quote">
        <figcaption>{END.quoteLead}</figcaption>
        <blockquote>{END.quote}</blockquote>
      </figure>

      {missed.length > 0 && (
        <p className="gv-revisit">
          <span>{END.revisit}</span>
          {missed.map((k) => (
            <Link key={k} href={PILLARS.find((p) => p.key === k)!.anchor}>
              {PILLAR_NAME[k]}
            </Link>
          ))}
        </p>
      )}

      <div className="gv-out">
        <Link className="chapter-end-back" href="/chapters">
          {END.back}
        </Link>
        {confirmReset ? (
          <span className="gv-reset-confirm" role="group" aria-label="אישור חזרה על התרגול">
            <span className="gv-reset-ask">לאפס ולהתחיל מחדש?</span>
            <button type="button" className="gv-secondary" onClick={onReset}>
              כן, להתחיל מחדש
            </button>
            <button type="button" className="gv-secondary" onClick={onCancelReset}>
              ביטול
            </button>
          </span>
        ) : (
          <button type="button" className="gv-secondary" onClick={onAskReset}>
            {END.again}
          </button>
        )}
      </div>
      <p className="gv-out-note">{END.againNote}</p>
    </section>
  )
}
