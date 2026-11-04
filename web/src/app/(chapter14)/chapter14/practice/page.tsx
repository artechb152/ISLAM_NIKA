/* The practice renders inside `PracticeNav`, the article's own shell, styled by
   chapter6-practice.css; the p2-* question rules are chapter 5's sheet, reused as is
   (one product, shared classes). */
import '@/styles/chapter6-practice.css'
import '@/styles/chapter5-practice.css'
import '@/styles/chapter14-practice.css'

import Chapter14Practice from '@/components/Chapter14Practice'

export default function Page() {
  return <Chapter14Practice />
}
