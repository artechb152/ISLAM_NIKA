import type { Metadata } from 'next'
import Accessibility from '@/components/reference/Accessibility'

export const metadata: Metadata = { title: 'הצהרת נגישות · אסלאם' }

export default function Page() {
  return <Accessibility />
}
