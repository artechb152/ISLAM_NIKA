/* The chapter's closing practice.

   Inside the (chapter3) route group on purpose: that group's layout is what
   loads fonts.css, chapter6-article.css and chapter3-article.css, so this page
   inherits the chapter's tokens, type scale and shell instead of re-declaring
   them. chapter6-practice.css is added here rather than in the layout because
   only this page needs the place-a-label surfaces. */

import type { Metadata } from 'next'
import '@/styles/chapter6-practice.css'
import Chapter3Practice from '@/components/Chapter3Practice'

export const metadata: Metadata = {
  title: 'תרגול מסכם · ראשית חיי מוחמד',
}

export default function Page() {
  return <Chapter3Practice />
}
