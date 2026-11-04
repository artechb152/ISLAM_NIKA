'use client'

/* three.js touches window/WebGL at module scope and the site is a static export, so the
   hall never renders on the server. dynamic(ssr:false) is only allowed in a client
   component, hence this wrapper — as in chapter 1. */

import dynamic from 'next/dynamic'

const FlagHall = dynamic(() => import('./FlagHall'), {
  ssr: false,
  loading: () => (
    <div className="ch13-loading">
      <p>האולם נטען…</p>
    </div>
  ),
})

export default function Chapter13Client() {
  return <FlagHall />
}
