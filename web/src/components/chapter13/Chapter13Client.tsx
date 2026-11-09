'use client'

/* three.js touches window/WebGL at module scope and the site is a static export, so the
   hall never renders on the server. dynamic(ssr:false) is only allowed in a client
   component, hence this wrapper — as in chapter 1. While the hall's code downloads, the
   same loading screen FlagHall shows for its textures is already up, at 0%. */

import dynamic from 'next/dynamic'
import HallLoading from './HallLoading'

const FlagHall = dynamic(() => import('./FlagHall'), {
  ssr: false,
  loading: () => <HallLoading pct={0} />,
})

export default function Chapter13Client() {
  return <FlagHall />
}
