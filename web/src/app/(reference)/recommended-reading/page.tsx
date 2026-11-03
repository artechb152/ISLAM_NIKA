import type { Metadata } from 'next'
import Reading from '@/components/reference/Reading'

export const metadata: Metadata = { title: 'ספרות מומלצת · אסלאם' }

export default function Page() {
  return <Reading />
}
