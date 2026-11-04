/* Positions on the chapter-5 plate (`/assets/chapter5/umar-map.jpg`), which this chapter
   reuses. The plate is a DRAWING, not a projection; lib/chapter5/map.ts fitted it to three
   features that are unambiguous in the artwork (the Nile delta apex, Cyprus, the head of
   the Persian Gulf):

     x = 0.15556 + (lon - 31.24) * 0.039778     (fraction of plate width)
     y = 0.34944 - (lat - 30.05) * 0.053086     (fraction of plate height)

   Equirectangular with NO cos(lat) term, because that is how the illustrator drew it. Do
   not "correct" it. Every pin and every region edge is checked against the artwork in a
   rendered proof (rule 65) — where the two disagree, the artwork wins. */

export const toPlate = (lon: number, lat: number): [number, number] => [
  0.15556 + (lon - 31.24) * 0.039778,
  0.34944 - (lat - 30.05) * 0.053086,
]
