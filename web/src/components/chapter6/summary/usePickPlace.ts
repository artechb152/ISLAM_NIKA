'use client'

/* One pick-then-place primitive, shared by all five movements: word tiles into a quotation,
   photographs into a day, chips into receptacles, people into gates, names onto a map.

   ONE code path serves both tap and drag, which is what keeps the accessibility identical on
   five visually different surfaces. A pointer press picks an item up; the release looks for a
   slot under the pointer (`[data-slot]`). Drag and release over a slot → placed. A press and
   release that never moved is a plain tap, and the click that follows picks the item up and
   leaves it in hand. Nothing special-cases a "drag mode".

   Keyboard gets the same three verbs with no pointer at all: Enter picks up, Enter on a slot
   places, Escape cancels. Focus is never moved for the reader — only announced.

   The hook knows nothing about correctness. `onPlace` decides, and a refusal releases the item
   so it returns to the tray rather than trapping the learner holding it. */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface PickPlace {
  held: string | null
  /* the slot that most recently refused an item — for a shake; cleared on the next action */
  refused: string | null
  /* live-region text; changes on every pick, place and refusal */
  say: string
  isHeld: (id: string) => boolean
  pick: (id: string) => void
  cancel: () => void
  place: (slotId: string) => void
  itemProps: (id: string) => {
    'aria-pressed': boolean
    onPointerDown: (e: ReactPointerEvent) => void
    onClick: () => void
  }
  slotProps: (slotId: string) => {
    'data-slot': string
    onClick: () => void
  }
  /* pointer position while dragging, for an optional ghost — null when not dragging */
  ghost: { id: string; x: number; y: number } | null
}

export function usePickPlace({
  onPlace,
  labelOf,
  slotLabelOf,
}: {
  /* return true if the item seated in that slot */
  onPlace: (itemId: string, slotId: string) => boolean
  labelOf: (id: string) => string
  slotLabelOf?: (slotId: string) => string
}): PickPlace {
  const [held, setHeld] = useState<string | null>(null)
  const [refused, setRefused] = useState<string | null>(null)
  const [say, setSay] = useState('')
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null)
  /* dragging is STATE, not a ref: the pointer effect has to re-run when a press begins */
  const [dragging, setDragging] = useState<string | null>(null)
  const moved = useRef(false)
  /* a completed drag is followed by a click on the same element — swallow it, or the item
     would be picked straight back up out of the slot it was just placed in */
  const suppressClick = useRef(false)

  const cancel = useCallback(() => {
    setHeld(null)
    setGhost(null)
    setRefused(null)
    setSay('הבחירה בוטלה.')
  }, [])

  const attempt = useCallback(
    (itemId: string, slotId: string) => {
      const ok = onPlace(itemId, slotId)
      setHeld(null)
      setGhost(null)
      if (ok) {
        setRefused(null)
        setSay(`${labelOf(itemId)} — הונח${slotLabelOf ? ` ב${slotLabelOf(slotId)}` : ''}.`)
      } else {
        setRefused(slotId)
        setSay(`${labelOf(itemId)} — לא כאן.`)
      }
    },
    [onPlace, labelOf, slotLabelOf]
  )

  const pick = useCallback(
    (id: string) => {
      setRefused(null)
      setHeld((current) => {
        if (current === id) {
          setSay('הבחירה בוטלה.')
          return null
        }
        setSay(`${labelOf(id)} — נבחר. בחרו מקום.`)
        return id
      })
    },
    [labelOf]
  )

  const place = useCallback(
    (slotId: string) => {
      if (!held) return
      attempt(held, slotId)
    },
    [held, attempt]
  )

  /* the pointer half — armed only while a press is live */
  useEffect(() => {
    if (!dragging) return
    function onMove(e: PointerEvent): void {
      moved.current = true
      setGhost({ id: dragging as string, x: e.clientX, y: e.clientY })
    }
    function onUp(e: PointerEvent): void {
      const id = dragging as string
      setDragging(null)
      setGhost(null)
      if (!moved.current) return // a plain tap — let the click handler pick it up
      suppressClick.current = true
      const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-slot]')
      if (slot?.dataset.slot) {
        attempt(id, slot.dataset.slot)
        return
      }
      /* dragged but released over nothing — keep it in hand so the tap flow can finish it */
      setHeld(id)
      setSay(`${labelOf(id)} — נבחר. בחרו מקום.`)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [dragging, attempt, labelOf])

  /* Escape cancels from anywhere while something is in hand */
  useEffect(() => {
    if (!held) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [held, cancel])

  return {
    held,
    refused,
    say,
    ghost,
    isHeld: (id) => held === id,
    pick,
    cancel,
    place,
    itemProps: (id) => ({
      'aria-pressed': held === id,
      onPointerDown: () => {
        setDragging(id)
        moved.current = false
        suppressClick.current = false
      },
      onClick: () => {
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        pick(id)
      },
    }),
    slotProps: (slotId) => ({
      'data-slot': slotId,
      onClick: () => {
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        place(slotId)
      },
    }),
  }
}
