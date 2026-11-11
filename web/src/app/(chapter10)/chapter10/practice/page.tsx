/* The practice renders inside `PracticeNav`, the article's own shell, styled by
   chapter6-practice.css; the p2-* question rules are
   shared-practice.css, which the shared engine imports itself (11.11.2026); chapter5-practice.css
   is kept for its banner shadow. */
import '@/styles/chapter6-practice.css'
import '@/styles/chapter5-practice.css'
import '@/styles/chapter10-practice.css'

import Chapter10Practice from '@/components/Chapter10Practice'

export default function Page() {
  return <Chapter10Practice />
}
