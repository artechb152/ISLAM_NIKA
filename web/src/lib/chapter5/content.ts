/* Chapter 2 content access.

   Every word of the chapter lives in passages.json, keyed by the §N of the
   source passage and split into named fragments. The article never writes a
   sentence — it asks for a fragment by reference ("§9.a"). Two things fall out
   of that:

     · a sentence cannot drift, because it exists in exactly one place;
     · "every sentence appears exactly once" becomes checkable, because
       concept/chapter5/verify-chapter5.mjs can diff the fragments that exist
       against the fragments layout.json consumes.

   Nothing here may be edited to change wording. Edit concept/chapter5/SOURCE-TEXT.md
   first — it is the source of truth — then mirror the change here and re-run the gate. */

import raw from './passages.json'

export interface Fragment {
  id: string
  /** the sentence itself */
  text?: string
  /** several short lines the source gives as a list */
  list?: string[]
  /** the source's own name for this item (יקטן, הפרט, בערות…) */
  name?: string
  /** an Arabic term this fragment introduces — the article sets it in maroon */
  term?: string
  /** Phrases inside `text` that the page sets in maroon. They are substrings of the
      sentence, never new words, and verify-chapter5.mjs fails if one drifts out of it. */
  em?: string[]
  /** Transliterated terms inside `text` — שׁוּרָא, גִ'זְיַה, הח'וארג'. Same contract as
      `em`, a different colour: gold, so a term the chapter is teaching is never mistaken
      for a fact the chapter is stressing. */
  tr?: string[]
  /** An APPROVED REWORDING, printed instead of `text`.
      The chapter's rule is that every sentence on the page is the source's own.
      This is the one sanctioned way to depart from it, and it exists so that a
      departure is a declared fact rather than a quiet edit: `text` still holds
      the source sentence and is still checked against SOURCE-TEXT.md, and
      verify-chapter5.mjs lists every `page` it finds so the count can never sit
      at zero while the page says something else. Add one only when the user has
      asked for that wording. */
  page?: string
}

interface PassagesFile {
  number: number
  title: string
  menuTitle: string
  passages: Record<string, Fragment[]>
}

const data = raw as unknown as PassagesFile

export const CH5 = { number: data.number, title: data.title, menuTitle: data.menuTitle }

/** `§9` → its fragments, in source order. */
export function passage(section: string): Fragment[] {
  const found = data.passages[section]
  if (!found) throw new Error(`chapter 5: unknown passage ${section}`)
  return found
}

/** `"§9.a"` → that one fragment. Throws loudly: a typo must never render blank. */
export function frag(ref: string): Fragment {
  const [section, id] = ref.split('.')
  const found = passage(section).find((f) => f.id === id)
  if (!found) throw new Error(`chapter 5: unknown fragment ${ref}`)
  return found
}

/** The sentence at `ref`, as the page prints it — the approved rewording if the
    fragment carries one, otherwise the source's own sentence. */
export function text(ref: string): string {
  const f = frag(ref)
  if (f.page) return f.page
  if (!f.text) throw new Error(`chapter 5: ${ref} carries no text`)
  return f.text
}

/** The list at `ref`. */
export function list(ref: string): string[] {
  const f = frag(ref)
  if (!f.list) throw new Error(`chapter 5: ${ref} carries no list`)
  return f.list
}

/** Every fragment reference that exists, for the coverage gate and for tests. */
export function allRefs(): string[] {
  return Object.entries(data.passages).flatMap(([section, frags]) =>
    frags.map((f) => `${section}.${f.id}`),
  )
}

/** The emphasised phrases at `ref`, or none. */
export function em(ref: string): string[] {
  return frag(ref).em ?? []
}

/** The transliterated terms at `ref`, or none. */
export function tr(ref: string): string[] {
  return frag(ref).tr ?? []
}
