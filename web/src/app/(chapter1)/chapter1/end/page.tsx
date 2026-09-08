/* סוף הדרך — דף, לא סצנה, ובמעטפת האתר. אותם גיליונות כמו דף התרגול. */

import type { Metadata } from 'next'
import '@/styles/chapter6-article.css'
import '@/styles/chapter2-article.css'
import '@/styles/chapter6-practice.css'
import ChapterOutro from '@/components/chapter1/ChapterOutro'

export const metadata: Metadata = {
  title: 'סוף הדרך · מסע אל ערב טרום האסלאם',
}

export default function Page() {
  return <ChapterOutro />
}
