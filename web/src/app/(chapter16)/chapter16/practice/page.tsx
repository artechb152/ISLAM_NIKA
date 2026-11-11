/* The practice renders inside `PracticeNav`, the article's own shell, styled by
   chapter6-practice.css; the question rules are shared-practice.css, which the shared engine
   imports itself. */
import '@/styles/chapter6-practice.css'
import '@/styles/chapter16-practice.css'

import Chapter16Practice from '@/components/Chapter16Practice'

export default function Page() {
  return <Chapter16Practice />
}
