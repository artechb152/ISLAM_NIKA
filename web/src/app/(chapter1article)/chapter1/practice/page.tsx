/* The practice renders inside `PracticeNav`, the article's own shell, styled by
   chapter6-practice.css; the p2-* question rules are
   shared-practice.css, which the shared engine imports itself (11.11.2026); chapter5-practice.css
   is kept for its banner shadow — chapter 14's page, part for part. */
import type { Metadata } from 'next'
import '@/styles/chapter6-practice.css'
import '@/styles/chapter5-practice.css'
import '@/styles/chapter1-practice.css'

import Chapter1ArticlePractice from '@/components/chapter1/Chapter1ArticlePractice'

export const metadata: Metadata = {
  title: 'פרק ראשון · התרגול המסכם',
}

export default function Page() {
  return <Chapter1ArticlePractice />
}
