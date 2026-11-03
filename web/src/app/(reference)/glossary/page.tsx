import type { Metadata } from 'next'
import Glossary from '@/components/reference/Glossary'

export const metadata: Metadata = { title: 'מילון מונחים · אסלאם' }

export default function Page() {
  return <Glossary />
}
