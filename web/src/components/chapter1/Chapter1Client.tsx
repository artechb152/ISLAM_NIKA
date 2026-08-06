'use client'

/* The 3D game must never render on the server: the site is a static export and
   three.js touches window/WebGL at module scope. dynamic(ssr:false) is only
   allowed inside a client component, hence this thin wrapper. */

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'

const Game = dynamic(() => import('@/components/chapter1/Game'), {
  ssr: false,
  loading: () => (
    <div className="ch1-loading">
      <p>טוען את המסע…</p>
    </div>
  ),
})

export default function Chapter1Client() {
  const [started, setStarted] = useState(false)

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
        <p className="ch1-opening-lead">
          הצטרפו לשיירה, חקרו את המחנה ופגשו את האנשים, המקומות והמושגים
          שעיצבו את חצי האי ערב ערב עליית האסלאם.
        </p>

        <button className="ch1-opening-start" type="button" onClick={() => setStarted(true)}>
          התחילו במסע
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6" /></svg>
        </button>
      </section>

      <div className="ch1-opening-route" aria-hidden="true">
        <span className="is-current" /><span /><span /><span /><span /><span /><span />
      </div>
    </main>
  )
}
