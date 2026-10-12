/* The practice screen renders inside `PracticeNav`, the article's own shell, which
   chapter6-practice.css styles — loaded here as chapter 5's practice route does. */
import '@/styles/chapter6-practice.css'
import '@/styles/chapter8-practice.css'

import Chapter8Practice from '@/components/Chapter8Practice'

export default function Page() {
  return <Chapter8Practice />
}
