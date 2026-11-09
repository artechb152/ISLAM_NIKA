/* Chapter 1 article content access — the same contract as chapters 5, 7 and 10.

   Every word lives in passages.json, keyed by the §N of concept/chapter1/SOURCE-TEXT.md.
   The article never writes a sentence; it asks for a fragment by reference ("§9.b").
   concept/chapter1/verify-article.mjs proves that the fragments of each § ARE that §,
   that layout.json places each one exactly once, and that every label a device shows
   (the route map, the two empire cards) is cut out of its own sentence. To change wording: SOURCE-TEXT.md first. */

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
export interface PairCard { side: 'nw' | 'ne'; name: Cut }
/** a label cut from a sentence by its words (the chapter-14 form) */
export interface CutRef { from: string; cut: string }
export interface Layout {
  sections: LayoutSection[]
  /** 02 — the two empires as two equal cards; every label cut from its card's sentence */
  pair: { cards: PairCard[] }
  /** 06 — the Abraha film: the file, an optional narration file, and its captions — one data place */
  film: { src: string; poster: string; narration: string | null; cues: (CutRef & { start: number; end: number })[] }
  /** 07 — the named idols, a row per sentence */
  idols: { rows: { from: string; caption: string; names: string[] }[] }
  /** 08 — §47's three words */
  words: { caption: CutRef; cards: { front: string; back: string; note?: string }[] }
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

/** A device label: the words are checked against the sentence they are cut from (rule 27) —
    a label that drifted from its sentence throws instead of printing something the source
    does not say. */
export function cut(c: Cut): string {
  if (!text(c.from).includes(c.label)) throw new Error(`chapter 1: label "${c.label}" is not in ${c.from}`)
  return c.label
}

/** The words of a label cut from its fragment (the chapter-14 form): throws on drift. */
export function cutOf(c: CutRef): string {
  if (!text(c.from).includes(c.cut)) throw new Error(`chapter 1: label "${c.cut}" is not in ${c.from}`)
  return c.cut
}
/** A word that must stand in its sentence once — the idols' names and §47's words. */
export function wordIn(ref: string, word: string): string {
  if (text(ref).split(word).length !== 2) throw new Error(`chapter 1: "${word}" is not in ${ref} exactly once`)
  return word
}
