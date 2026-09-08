'use client'

/* The 3D game must never render on the server: the site is a static export and
   three.js touches window/WebGL at module scope. dynamic(ssr:false) is only
   allowed inside a client component, hence this thin wrapper.

   מסך הפתיחה שהיה כאן עבר אל /chapter1 (Chapter1Entry), בתוך מעטפת
   האתר; הכתובת הזאת — /chapter1/play — היא המשחק בלבד, ומתחילה מיד. */

import dynamic from 'next/dynamic'
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
  /* אזור הסיום אינו עולם — הוא דף ב-/chapter1/end. השער האחרון במשחק
     מנווט אל `?region=exit` על הכתובת הנוכחית, ומכאן ממשיכים אל הדף.
     יחסית ל-pathname ולא בנתיב מוחלט, כי באתר החי יש basePath. */
  const [show, setShow] = useState(false)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('region') === 'exit') {
      const base = window.location.pathname.replace(/\/play\/?$/, '')
      window.location.replace(`${base}/end/`)
      return
    }
    setShow(true)
  }, [])

  if (!show) return <div className="ch1-loading" aria-hidden="true" />
  return <Game />
}
