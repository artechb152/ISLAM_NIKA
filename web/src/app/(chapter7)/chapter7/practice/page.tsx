/* The practice screen renders inside `PracticeNav`, the article's own shell, which
   chapter6-practice.css styles — loaded here as chapter 5's practice route does. */
import '@/styles/chapter6-practice.css'
import '@/styles/chapter7-practice.css'

import Chapter7Practice from '@/components/Chapter7Practice'

export default function Page() {
  return <Chapter7Practice />
}
