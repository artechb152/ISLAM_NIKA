import type { Metadata } from 'next'
import Maps from '@/components/reference/Maps'

export const metadata: Metadata = { title: 'מפות · אסלאם' }

export default function Page() {
  return <Maps />
}
