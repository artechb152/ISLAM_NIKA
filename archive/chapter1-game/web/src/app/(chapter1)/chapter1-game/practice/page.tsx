/* Chapter 1's closing practice.

   Inside the (chapter1) route group so the chapter's own layout — fonts.css and
   chapter1.css — still wraps it, and the sheets the practice needs are loaded
   here on top of that, exactly as chapter 2's and chapter 3's practice pages do
   it: chapter6-article.css is the shell (masthead, rail, `.chapter-article`
   rhythm, `.section-heading`, `.title-ornament`), chapter2-article.css carries
   the exercise surfaces (`.p2-*`) that all the closing practices share, and
   chapter6-practice.css dresses the rail. This is one product, and the classes
   are shared rather than copied.

   Loaded at the page rather than in the layout because only this page needs
   them — the game must keep chapter1.css as its last word. */

import type { Metadata } from 'next'
import '@/styles/chapter6-article.css'
import '@/styles/chapter2-article.css'
import '@/styles/chapter6-practice.css'
import Chapter1Practice from '@/components/chapter1/Chapter1Practice'

export const metadata: Metadata = {
  title: 'תרגול מסכם · מסע אל ערב טרום האסלאם',
}

export default function Page() {
  return <Chapter1Practice />
}
