'use client'

/* THE FORCE BALANCE, BUILT IN FRONT OF THE READER.

   The chapter states two ratios and the second one is the point: three hundred
   against a thousand at Badr, a thousand against three thousand at Uhud — the
   same army, once outnumbered and once outnumbering, and „מעטים מול רבים" only
   means something if both are on screen at the same scale.

   As a number inside a paragraph a reader takes it on trust and forgets it by
   the next line. Drawn to length against a shared scale, the ratio is the shape
   of the block, and the reversal between the two sections is visible without
   anyone saying so.

   THE NUMBERS ARE THE SOURCE'S. Each one is lifted from the sentence it belongs
   to and proved to be in it before it is printed — Chapter4.tsx passes them
   through `pick`, which throws if the digits are not in that fragment. The
   sentences themselves stay beside the bars, unabridged.

   IT ANIMATES ON ARRIVAL, NOT ON A CLICK. There is nothing to press: the bars
   grow when the block reaches the reader, and a reader who prefers no motion
   gets them at full length immediately. */

import { useEffect, useRef, useState } from 'react'

export default function Forces({
  rows,
}: {
  rows: { num: number; label: string; text: string; side: 'a' | 'b' }[]
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [grown, setGrown] = useState(false)
  const max = Math.max(...rows.map((r) => r.num))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGrown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setGrown(true)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="ch4-scale" ref={ref} data-reveal>
      {rows.map((r) => (
        <div className={`ch4-scale-row is-${r.side}`} key={r.label}>
          <div className="ch4-scale-head">
            <b>{r.label}</b>
            <i>{r.num.toLocaleString('he-IL')}</i>
          </div>
          <div className="ch4-scale-track">
            <span style={{ width: grown ? `${(r.num / max) * 100}%` : '0%' }} />
          </div>
          <p className="ch4-scale-text">{r.text}</p>
        </div>
      ))}
    </div>
  )
}
