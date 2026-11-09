'use client'

/* מפות — עמודים 120–124 בחוברת: חמש מפות, כל אחת עם הכיתוב והקרדיט שלה.
   המפות הן מסמכים שהחוברת שאלה ממקורות אחרים, לא איורים שלנו — ולכן הן לא
   נחתכות ולא נפרצות למרזב, אלא יושבות במידה שלהן עם קו שיער, והכיתוב מתחתן.
   לחיצה פותחת אותן גדולות; הקבצים קטנים (‎~520–920px‎), ולכן גם הגדלה עוצרת
   פעמיים מהמידה הטבעית ולא ממלאת מסך בפיקסלים מטושטשים.

   שתי המפות של עמוד 121 עומדות זו לצד זו — אותו עמוד, אותה מידה. */

import { useEffect, useRef, useState } from 'react'
import ReferenceShell from '@/components/reference/ReferenceShell'
import MAPS from '@/lib/reference/maps.json'

type MapDef = { id: string; page: number; src: string; w: number; dw: number; h: number; caption: string; credit: string; captionInImage?: boolean }
const LIST = MAPS.maps as MapDef[]

function Figure({ m, onOpen }: { m: MapDef; onOpen: (m: MapDef) => void }) {
  return (
    <figure className="ref-map" style={{ ['--map-w' as string]: `${m.dw}px` }}>
      <button type="button" className="ref-map-btn" onClick={() => onOpen(m)} aria-label={`הגדלת המפה: ${m.caption}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.src} width={m.w} height={m.h} alt={m.caption} loading="lazy" />
        <span className="ref-map-zoom" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5M11 8v6M8 11h6" /></svg>
        </span>
      </button>
      <figcaption>
        {!m.captionInImage && <b>{m.caption}</b>}
        <span>{m.credit}</span>
      </figcaption>
    </figure>
  )
}

export default function Maps() {
  const [open, setOpen] = useState<MapDef | null>(null)
  const dlg = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dlg.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  /* שורה לכל עמוד בחוברת: מה שחלק עמוד עומד יחד */
  const rows = [...new Set(LIST.map((m) => m.page))].map((p) => LIST.filter((m) => m.page === p))

  return (
    <ReferenceShell current="maps" eyebrow="מפות" title="מפות" subtitle={`${LIST.length} מפות מתוך החוברת`}>
      <section className="article-section ref-maps" aria-label="המפות">
        {rows.map((row) => (
          <div className={'ref-map-row' + (row.length > 1 ? ' is-pair' : '')} key={row[0].id}>
            {row.map((m) => (
              <Figure key={m.id} m={m} onOpen={setOpen} />
            ))}
          </div>
        ))}
      </section>

      <dialog
        ref={dlg}
        className="ref-lightbox"
        aria-label={open?.caption}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null)
        }}
      >
        {open && (
          <figure style={{ ['--map-w' as string]: `${open.dw * 2}px` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.src} width={open.w} height={open.h} alt={open.caption} />
            <figcaption>
              <b>{open.caption}</b>
              <span>{open.credit}</span>
            </figcaption>
          </figure>
        )}
        <button type="button" className="ref-lightbox-close" onClick={() => setOpen(null)} aria-label="סגירה">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </dialog>
    </ReferenceShell>
  )
}
