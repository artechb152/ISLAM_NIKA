/* Chapter 2 content access.

   Every word of the chapter lives in passages.json, keyed by the §N of the
   source passage and split into named fragments. The article never writes a
   sentence — it asks for a fragment by reference ("§9.a"). Two things fall out
   of that:

     · a sentence cannot drift, because it exists in exactly one place;
     · "every sentence appears exactly once" becomes checkable, because
       concept/chapter2/verify-chapter2.mjs can diff the fragments that exist
       against the fragments layout.json consumes.

   Nothing here may be edited to change wording. Edit concept/chapter2/SOURCE-TEXT.md
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
}

interface PassagesFile {
  number: number
  title: string
  menuTitle: string
  passages: Record<string, Fragment[]>
}

const data = raw as unknown as PassagesFile

export const CH2 = { number: data.number, title: data.title, menuTitle: data.menuTitle }

/** `§9` → its fragments, in source order. */
export function passage(section: string): Fragment[] {
  const found = data.passages[section]
  if (!found) throw new Error(`chapter 2: unknown passage ${section}`)
  return found
}

/** `"§9.a"` → that one fragment. Throws loudly: a typo must never render blank. */
export function frag(ref: string): Fragment {
  const [section, id] = ref.split('.')
  const found = passage(section).find((f) => f.id === id)
  if (!found) throw new Error(`chapter 2: unknown fragment ${ref}`)
  return found
}

/** The sentence at `ref`. */
export function text(ref: string): string {
  const f = frag(ref)
  if (!f.text) throw new Error(`chapter 2: ${ref} carries no text`)
  return f.text
}

/** The list at `ref`. */
export function list(ref: string): string[] {
  const f = frag(ref)
  if (!f.list) throw new Error(`chapter 2: ${ref} carries no list`)
  return f.list
}

/** Every fragment reference that exists, for the coverage gate and for tests. */
export function allRefs(): string[] {
  return Object.entries(data.passages).flatMap(([section, frags]) =>
    frags.map((f) => `${section}.${f.id}`),
  )
}
