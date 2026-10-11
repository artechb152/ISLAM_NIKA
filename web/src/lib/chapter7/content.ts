/* Chapter 7 content access — the same contract as chapter 5.

   Every word of the chapter lives in passages.json, keyed by the §N of
   concept/chapter7/SOURCE-TEXT.md. The article never writes a sentence; it asks
   for a fragment by reference ("§7.a"). concept/chapter7/verify-chapter7.mjs
   proves that the fragments of each § ARE that §, that layout.json places each
   one exactly once, and that Chapter7.tsx prints exactly the ones layout.json
   says it does. To change wording: SOURCE-TEXT.md first, then here, then the gate. */

import raw from './passages.json'
import layoutRaw from './layout.json'

export interface Fragment {
  id: string
  text?: string
  /** a month's number in §8's list */
  num?: number
  /** a month's name in §8's list */
  name?: string
  /** a title cut out of the § (the two schools) — checked as a substring */
  label?: string
  /** maroon emphasis — substrings of text */
  em?: string[]
  /** gold transliteration — substrings of text */
  tr?: string[]
  kind?: 'verse' | 'arabic'
}

interface PassagesFile {
  number: number
  title: string
  menuTitle: string
  passages: Record<string, Fragment[]>
}
const data = raw as unknown as PassagesFile
export const CH7 = { number: data.number, title: data.title, menuTitle: data.menuTitle }

export function frag(ref: string): Fragment {
  const [section, id] = ref.split('.')
  const found = data.passages[section]?.find((f) => f.id === id)
  if (!found) throw new Error(`chapter 7: unknown fragment ${ref}`)
  return found
}
export function text(ref: string): string {
  const t = frag(ref).text
  if (t == null) throw new Error(`chapter 7: ${ref} carries no text`)
  return t
}
export const em = (ref: string): string[] => frag(ref).em ?? []
export const tr = (ref: string): string[] => frag(ref).tr ?? []

export interface Sub { id: string; title: string }
export interface LayoutSection {
  id: string
  title: string
  /** the Arabic term beside the title — the source's own Arabic */
  term?: string
  subs?: Sub[]
  uses: string[]
  devices?: Record<string, string[]>
}
export interface Layout {
  sections: LayoutSection[]
  holy: string[]
  legend: { holy: string }
  drift: { month: string; days: number; stops: { year: string; day: number; date: string; note?: string; caption?: string }[] }
  sighting: { hint: string; notSeen: string; seen: string }
  gap: { lunar: number; solar: number; gap: number; lunarLabel: string; solarLabel: string; gapLabel: string }
}
export const LAYOUT = layoutRaw as unknown as Layout
export const SECTIONS = LAYOUT.sections

export function meta(id: string): LayoutSection {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 7: unknown section ${id}`)
  return s
}
export function sub(sectionId: string, subId: string): string {
  const s = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!s) throw new Error(`chapter 7: unknown sub ${sectionId}/${subId}`)
  return s.title
}
