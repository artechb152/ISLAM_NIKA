/* האם אפשר להיחלץ? מציבים את השחקן *בתוך* צבירי קוליידרים חופפים
   (מה שקורה כשגמל דוחף, או כשנכנסים לפינה) ומנסים לצאת בכל כיוון. */
import { layouts, ORDER, collidersOf } from '../scripts/route-sim.mjs'
const PLAYER_R = 0.45, SPEED = 2.6, DT = 1/60
function resolveCurrent(px, pz, cols, passes = 2) {
  for (let pass = 0; pass < passes; pass++) {
    let touched = false
    for (const c of cols) {
      const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz), min = c.r + PLAYER_R
      if (d < min) { touched = true
        if (d < 1e-4) px = c.x + min
        else { px = c.x + (dx/d)*min; pz = c.z + (dz/d)*min } }
    }
    if (!touched) break
  }
  return [px, pz]
}
function inside(x, z, cols) { return cols.some(c => Math.hypot(x-c.x, z-c.z) < c.r + PLAYER_R - 1e-6) }

for (const passes of [2, 8]) {
  let trapped = 0, tested = 0, stillInside = 0
  for (const id of ORDER) {
    const L = layouts[id], cols = collidersOf(L), bound = (L.bound ?? 24) - 0.5
    /* נקודות מבחן: מרכזי חפיפות עמוקות */
    const spots = []
    for (let i = 0; i < cols.length; i++) for (let j = i+1; j < cols.length; j++) {
      const a = cols[i], c = cols[j], d = Math.hypot(a.x-c.x, a.z-c.z)
      if (a.r + c.r - d > 0.2) spots.push({ x: (a.x+c.x)/2, z: (a.z+c.z)/2 })
    }
    for (const s of spots) {
      if (Math.hypot(s.x, s.z) > bound) continue
      tested++
      let escaped = false
      for (let a = 0; a < 16 && !escaped; a++) {
        const th = a*Math.PI/8, dir = { x: Math.sin(th), z: Math.cos(th) }
        let x = s.x, z = s.z
        ;[x, z] = resolveCurrent(x, z, cols, passes)
        for (let i = 0; i < 240; i++) {
          x += dir.x*SPEED*DT; z += dir.z*SPEED*DT
          ;[x, z] = resolveCurrent(x, z, cols, passes)
          const d = Math.hypot(x, z); if (d > bound) { x *= bound/d; z *= bound/d }
        }
        if (Math.hypot(x - s.x, z - s.z) > 1.5) escaped = true
      }
      if (!escaped) trapped++
      const [rx, rz] = resolveCurrent(s.x, s.z, cols, passes)
      if (inside(rx, rz, cols)) stillInside++
    }
  }
  console.log(`מעברים=${passes}: נבדקו ${tested} נקודות בתוך חפיפות · לכודים ${trapped} · נשארים בתוך מכשול אחרי הפתרון ${stillInside}`)
}
