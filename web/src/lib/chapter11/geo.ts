/* Chapter 11 — where a longitude/latitude sits on the relief.

   The relief is built in Blender from Terrarium elevation tiles (zoom 5, x 14–21, y 9–15 —
   concept/chapter11/blender/build-relief.py) and its extent is written to relief.json by the
   same export. This file is the ONE place that turns a place in the world into a place on
   the model, with the same Web-Mercator formula Blender used, so a label can never drift
   from the ground it names (rule 65: coordinates are computed, not eyeballed).

   Map units: the model is `width` wide (east–west) and `depth` deep, centred on the origin.
   three.js world: X = east, Y = up, Z = SOUTH (north is −Z). */

import relief from './relief.json'

export const RELIEF = relief as {
  width: number
  depth: number
  zmin: number
  zmax: number
  grid: [number, number]
  tiles: { z: number; x0: number; x1: number; y0: number; y1: number }
}

/** [lon, lat] → [x, z] on the model (three.js world, ground plane) */
export function lonlat(lon: number, lat: number): [number, number] {
  const { z, x0, x1, y0, y1 } = RELIEF.tiles
  const n = 2 ** z
  const tx = ((lon + 180) / 360) * n
  const r = (lat * Math.PI) / 180
  const ty = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  const u = (tx - x0) / (x1 - x0 + 1)
  const v = (ty - y0) / (y1 - y0 + 1)
  return [u * RELIEF.width - RELIEF.width / 2, v * RELIEF.depth - RELIEF.depth / 2]
}
