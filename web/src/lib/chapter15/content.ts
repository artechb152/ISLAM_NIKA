/* Chapter 15 content access.

   The chapter is a TABLE in the source — year · event · region of influence, 23 rows
   and six merged region cells — so passages.json is not a list of sentences but the
   table itself: `head` (the column headings, §0), `rows` (§1–§23) and `regions`.
   The page never writes a word of it; it asks for a row by its §N.

   Nothing here may be edited to change wording. Edit concept/chapter15/SOURCE-TEXT.md,
   run concept/chapter15/build-passages.mjs, then concept/chapter15/verify-chapter15.mjs. */

import raw from './passages.json'
import layoutData from './layout.json'

export interface Row { year: string; text: string }
export interface Region { id: string; text: string; rows: string[] }

interface PassagesFile {
  number: number
  title: string
  range: string
  menuTitle: string
  head: { year: string; event: string; region: string }
  rows: Record<string, Row>
  regions: Region[]
}

export interface Place { cut: string; lon: number; lat: number }
export interface LayoutSection { id: string; title: string; rows: string[] }
interface LayoutFile {
  axis: { from: number; to: number }
  sections: LayoutSection[]
  links: Record<string, { ch: number; proof: string }>
  places: Record<string, Place>
  regions: Record<string, { shapes: string[]; label: [number, number] }>
  shapes: Record<string, [number, number][]>
}

const data = raw as unknown as PassagesFile
export const LAYOUT = layoutData as unknown as LayoutFile

export const CH15 = { number: data.number, title: data.title, range: data.range, menuTitle: data.menuTitle }
export const HEAD = data.head
export const REGIONS = data.regions
/** every row, in source order — the ruler draws all of them on every stage */
export const ROW_ORDER = Object.keys(data.rows)

/** `"§6"` → that row. Throws loudly: a typo must never render blank. */
export function row(ref: string): Row {
  const r = data.rows[ref]
  if (!r) throw new Error(`chapter 15: unknown row ${ref}`)
  return r
}

/** the merged region cell a row sits in */
export function regionOf(ref: string): Region {
  const g = data.regions.find((x) => x.rows.includes(ref))
  if (!g) throw new Error(`chapter 15: row ${ref} has no region cell`)
  return g
}

/** a row's year(s) as numbers — „656-874" is the table's one span */
export const years = (ref: string): number[] => row(ref).year.split('-').map(Number)
