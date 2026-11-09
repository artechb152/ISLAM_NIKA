/* Chapter 1 article content access — the same contract as chapters 5, 7 and 10.

   Every word lives in passages.json, keyed by the §N of concept/chapter1/SOURCE-TEXT.md.
   The article never writes a sentence; it asks for a fragment by reference ("§9.b").
   concept/chapter1/verify-article.mjs proves that the fragments of each § ARE that §,
   that layout.json places each one exactly once, and that every label the crate shows
   is cut out of its own sentence. To change wording: SOURCE-TEXT.md first. */

import raw from './passages.json'
import layoutRaw from './layout.json'

export interface Fragment {
  id: string
  text?: string
  /** maroon emphasis — substrings of text */
  em?: string[]
  /** gold transliteration — substrings of text */
  tr?: string[]
}

interface PassagesFile {
  number: number
  title: string
  menuTitle: string
  passages: Record<string, Fragment[]>
}

const data = raw as unknown as PassagesFile

export const CH1 = { number: data.number, title: data.title, menuTitle: data.menuTitle }

export function frag(ref: string): Fragment {
  const [section, id] = ref.split('.')
  const found = data.passages[section]?.find((f) => f.id === id)
  if (!found) throw new Error(`chapter 1: unknown fragment ${ref}`)
  return found
}

export function text(ref: string): string {
  const t = frag(ref).text
  if (t == null) throw new Error(`chapter 1: ${ref} carries no text`)
  return t
}

export const em = (ref: string): string[] => frag(ref).em ?? []
export const tr = (ref: string): string[] => frag(ref).tr ?? []

export interface Sub { id: string; title: string }
export interface LayoutSection { id: string; title: string; subs?: Sub[]; uses: string[] }
export interface Cut { label: string; from: string }
export interface Empire extends Cut { side: 'nw' | 'ne'; x: number; y: number; tribe: string }
export interface Layout {
  sections: LayoutSection[]
  route: {
    width: number
    height: number
    /** the painted road, as fractions of the source plate — measured, see RouteMap */
    points: [number, number][]
    start: Cut
    goods: Cut[]
    empires: Empire[]
  }
}

export const LAYOUT = layoutRaw as unknown as Layout
export const SECTIONS = LAYOUT.sections

export function meta(id: string): LayoutSection {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 1: unknown section ${id}`)
  return s
}

export function sub(sectionId: string, subId: string): string {
  const s = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!s) throw new Error(`chapter 1: unknown sub ${sectionId}/${subId}`)
  return s.title
}
