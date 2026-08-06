'use client'

/* The labels waiting to be placed.

   NOT A BOX. The previous build put them inside a dashed-bordered, filled panel, which was one
   more rectangle on a page the reader already found full of rectangles. Here they are what the
   article would make them: a small label, and a wrapped row of the article's pill buttons
   sitting directly on the parchment.

   The row keeps its height when it empties and says „ריק“ rather than collapsing — a panel that
   vanishes takes the layout with it, and one that is empty at rest reads as broken.

   A wrong drop returns a label here. Nothing is ever deleted, and the feedback line says so in
   those words. */

export interface TrayItem {
  id: string
  text: string
}

export default function Tray({
  items,
  label,
  heldId,
  itemPropsFor,
  emptyText,
}: {
  items: TrayItem[]
  label: string
  heldId: string | null
  itemPropsFor: (id: string) => Record<string, unknown>
  emptyText: string
}) {
  /* NO PRINTED HEADING. „תוויות“ sat above every tray on the page in small maroon caps, naming
     a row of labels that is unmistakably a row of labels — the instruction in the section
     heading has already said what to do with them. It stays as the group's accessible name,
     where it is doing work: a screen reader meets the row without the surrounding page. */
  return (
    <div className="gv-tray" role="group" aria-label={label}>
      {items.length === 0 ? (
        <p className="gv-tray-empty">{emptyText}</p>
      ) : (
        items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={'gv-chip' + (heldId === it.id ? ' is-held' : '')}
            {...itemPropsFor(it.id)}
          >
            {it.text}
          </button>
        ))
      )}
    </div>
  )
}
