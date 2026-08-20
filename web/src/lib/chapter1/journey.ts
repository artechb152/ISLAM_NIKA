/* The world map's geography: where each region sits on the painted parchment.

   The plate (`tex/worldmap.jpg`) is drawn with no lettering at all — every name
   on the map is an HTML layer, so wording can be fixed without repainting. The
   coordinates below are percentages of the plate, read off its landmarks: the
   terraced Yemeni village at the bottom, the stone way-station and the palm
   oasis on the caravan track, the cliff monastery to the east, and the walled
   town with the cube at the top. South is down, the Red Sea is to the left, and
   the order of this list is the order of the journey — which is also the order
   of the source text. */

export interface MapPin {
  /** region id in dialogue.json */
  id: string
  /** short label for the pin — the full region name is often a sentence */
  label: string
  /** percentages of the plate, physical (left/top), not logical */
  left: number
  top: number
  /** which side the label hangs off, so neighbouring pins do not collide */
  side?: 'start' | 'end'
}

export const MAP_PINS: MapPin[] = [
  { id: 'yemen-heights', label: 'רמות תימן', left: 43, top: 90, side: 'end' },
  { id: 'night-camp', label: 'מחנה הלילה', left: 39.5, top: 78.5, side: 'start' },
  { id: 'border-post', label: 'תחנת הגבול', left: 46, top: 57.5, side: 'end' },
  { id: 'narrow-pass', label: 'המעבר הצר', left: 52.5, top: 50, side: 'end' },
  { id: 'loading-road', label: 'הדרך וההעמסה', left: 43, top: 45, side: 'start' },
  { id: 'yathrib', label: 'ית׳רב', left: 48.5, top: 40.5, side: 'end' },
  { id: 'monastery', label: 'המנזר', left: 65.5, top: 34.5, side: 'end' },
  { id: 'mecca', label: 'מכה', left: 52.5, top: 13, side: 'start' },
  { id: 'exit', label: 'ערב עליית האסלאם', left: 62, top: 7, side: 'end' },
]

/** The plate's own proportions — the overlay keeps them so pins stay on landmarks. */
export const MAP_ASPECT = 1280 / 724
