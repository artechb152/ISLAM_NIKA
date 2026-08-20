'use client'

/* Screen 30 — the chapter's close, and it closes on the question the chapter opened with.

   THE ORDER IS THE POINT. The film at the top of the chapter is a stranger asking Muhammad
   „יא מוחמד, מהו האסלאם?“ — so that is this block's title, Muhammad's answer is the first thing
   under it, and the five icons come after the words rather than before them. They are the way
   BACK into the chapter, and they now sit directly above the way out of it, so everything that
   takes the reader somewhere is in one place at the bottom.

   The order used to be the reverse of that, and each of the five names carried a one-line
   summary of its topic underneath. Both are gone: a summary that re-states five exercises the
   reader has just finished is teaching them what they have this second demonstrated they know,
   and it buried the sentence the whole chapter exists to explain at the bottom of the screen.

   THE VERBS COME BACK HERE, and only here: as the chapter's own sentence (drawerContent[2]),
   read rather than operated. A sentence to finish on, not an interface to work.

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
      {/* the article's heading, the same one the five commandments and the two questions above
          it carry: Kedem h2 at the section size, the diamond ornament, and the muted lead in
          the heading's own slot. This block used to announce itself in a smaller type size with
          the lead as a loose paragraph beneath — the one section on the page in a different
          voice, which is exactly what every other block here was rebuilt to stop doing. */}
      <header className="section-heading gv-section-head">
        <div>
          <h2 id="gv-end-t">{END.title}</h2>
        </div>
        <div className="title-ornament section-ornament" aria-hidden="true">
          <span />
        </div>
        <p>{END.lead}</p>
      </header>

      {/* Not gold-framed. `.shahada-quote` is the chapter's ONE illuminated frame and it is
          already spent twice on this page — the testimony at the centre of the shahada exercise
          and the pilgrimage clause in the closing. A third would make a rare thing ordinary,
          which is the mistake this whole page was rebuilt to undo. */}
      <figure className="gv-end-quote">
        <figcaption>{END.quoteLead}</figcaption>
        <blockquote>{END.quote}</blockquote>
      </figure>

      {/* the five, as the way back in — names only. What each one MEANS is the chapter, two
          screens' worth of it, and a caption here could only be a worse version of it. */}
      <p className="gv-end-nav">{END.navLead}</p>
      <ul className="gv-end-frieze">
        {PILLARS.map((p) => (
          <li key={p.key}>
            <Link className="gv-end-pillar" href={p.anchor}>
              <span className="gv-end-ico" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/anim-video/${p.icon}`} alt="" />
              </span>
              <b>{p.name}</b>
            </Link>
          </li>
        ))}
      </ul>

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
