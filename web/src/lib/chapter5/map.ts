/* Pin positions on the chapter-5 conquest plate (`/assets/chapter5/umar-map.jpg`).

   THE PLATE IS A DRAWING, NOT A PROJECTION. It was illustrated, not plotted, so no
   formula can be trusted to land a pin on it — every position below was placed by the
   approximation underneath and then CHECKED AGAINST THE ARTWORK in a rendered proof.
   Where the two disagreed, the artwork won. That is why some values differ from what
   the formula returns, and why changing the plate invalidates all of them.

   The approximation, fitted to three features that are unambiguous in the drawing —
   the Nile delta apex, Cyprus, and the head of the Persian Gulf:

     x = 0.15556 + (lon - 31.24) * 0.039778     (fraction of plate width)
     y = 0.34944 - (lat - 30.05) * 0.053086     (fraction of plate height)

   It is equirectangular with NO cos(lat) term, because the illustrator drew it that
   way: the fit is ~71.5 px/degree in both axes at 1800px wide. Do not "correct" it.

   Positions are fractions of the plate's own box, so they hold at any rendered size.
   Order is the order the SOURCE gives (§4), which is the order the scroll reveals them.  */

export interface MapPin {
  id: string
  /* the Hebrew label lives in the DOM — the plate carries no lettering of any kind */
  label: string
  note?: string
  x: number
  y: number
}

/* Medina is not a conquest. It is where the reader starts, and it is on the plate from
   the first step so the expansion has somewhere to expand FROM. */
export const ORIGIN: MapPin = { id: 'medina', label: 'מדינה', x: 0.488, y: 0.645 }

export const CONQUESTS: MapPin[] = [
  /* The note is whatever the source gives and no more: it dates Jerusalem and Egypt and
     dates neither Iraq nor Syria, so those two carry the province instead of a year I
     would have had to supply. */
  { id: 'qadisiyya', label: 'אלקאדסיה', note: 'עיראק', x: 0.677, y: 0.267 },
  { id: 'yarmouk', label: 'הירמוכ', note: 'סוריה', x: 0.343, y: 0.207 },
  { id: 'jerusalem', label: 'ירושלים', note: '638', x: 0.318, y: 0.270 },
  { id: 'egypt', label: 'מצרים', note: '640 · פוסטאט', x: 0.174, y: 0.386 },
]
