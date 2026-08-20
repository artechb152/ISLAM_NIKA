'use client'

/* The 3D game must never render on the server: the site is a static export and
   three.js touches window/WebGL at module scope. dynamic(ssr:false) is only
   allowed inside a client component, hence this thin wrapper. */

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const Game = dynamic(() => import('@/components/chapter1/Game'), {
  ssr: false,
  loading: () => (
    <div className="ch1-loading">
      <p>טוען את המסע…</p>
    </div>
  ),
})

export default function Chapter1Client() {
  /* Crossing a region boundary reloads the document, because the world is built
     once at module scope. A traveller who is already walking must not be handed
     the title page again at every gate — the `?from=` the crossing carries says
     they are mid-journey, so the game starts straight away.

     Read in an effect rather than in the initial state: the page is
     prerendered, so a first render that disagrees with the server is a
     hydration mismatch. */
  const [started, setStarted] = useState(false)
  /* עד שהאפקט רץ אי אפשר לדעת אם זו כניסה חדשה או מעבר תחנה,
     ולכן רינדור מסך הפתיחה בינתיים גרם לו להבהב בכל שער —
     כאילו המסע מתחיל מחדש בכל פעם. עד שיודעים, לא מציגים
     אף אחד מהשניים. */
  const [know, setKnow] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('from')) setStarted(true)
    setKnow(true)
    /* מושכים את צ׳אנק המשחק בזמן שקוראים את מסך הפתיחה. בלי זה
       ההורדה מתחילה רק בלחיצה, ו„טוען את המסע…“ הוא המסך הראשון
       שרואים אחריה. */
    void import('@/components/chapter1/Game')
  }, [])

  if (!know) return <div className="ch1-loading" aria-hidden="true" />
  if (started) return <Game />

  return (
    <main className="ch1-opening">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="ch1-opening-backdrop"
        src="/assets/chapter1/concept/station1-camp.png"
        alt=""
        aria-hidden="true"
      />
      <div className="ch1-opening-shade" aria-hidden="true" />

      <header className="ch1-opening-header">
        <Link className="ch1-opening-logo" href="/chapters" aria-label="חזרה לעמוד הפרקים">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-cream.png" alt="אסלאם" />
        </Link>
        <Link className="ch1-opening-back" href="/chapters">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          לכל הפרקים
        </Link>
      </header>

      <section className="ch1-opening-content" aria-labelledby="ch1-opening-title">
        <h1 id="ch1-opening-title">טרום האסלאם</h1>
        {/* „חקרו את המחנה“ עמד כאן, אבל המחנה הוא התחנה השנייה מתשע
            והכפתור מוביל לרמות תימן — הבטחה שהמסך הבא סותר. */}
        <p className="ch1-opening-lead">
          הצטרפו לשיירה, חצו תשעה מקומות מרמות תימן ועד מכה, ופגשו את האנשים,
          המקומות והמושגים שעיצבו את חצי האי ערב ערב עליית האסלאם.
        </p>

        <button className="ch1-opening-start" type="button" onClick={() => setStarted(true)}>
          התחילו במסע
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6" /></svg>
        </button>
      </section>

      {/* נקודה לכל אזור. היו שבע לתשעה אזורים. */}
      <div className="ch1-opening-route" aria-hidden="true">
        <span className="is-current" />
        <span /><span /><span /><span /><span /><span /><span /><span />
      </div>
    </main>
  )
}
