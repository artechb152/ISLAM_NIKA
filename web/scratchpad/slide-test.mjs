/* מבחן ההחלקה: מתקרבים אל מכשול בזווית ומודדים כמה מן ההתקדמות נשמרת.
   מכשול חוסם — זה נכון. מכשול שעוצר גם גישה משיקה הוא „תקיעה". */
import { layouts, ORDER, collidersOf } from '../scripts/route-sim.mjs'
const PLAYER_R = 0.45, SPEED = 2.6, DT = 1/60, STEPS = 180
const FREE = SPEED * DT * STEPS

function resolveCurrent(px, pz, cols) {
  for (let pass = 0; pass < 2; pass++) {
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

function run(resolve, offsetFrac) {
  const buckets = { blocked: 0, poor: 0, ok: 0, n: 0 }
  for (const id of ORDER) {
    const L = layouts[id], cols = collidersOf(L), bound = (L.bound ?? 24) - 0.5
    for (const c of cols) {
      if (c.r < 0.3) continue
      for (let a = 0; a < 8; a++) {
        const th = a * Math.PI / 4
        const dir = { x: Math.sin(th), z: Math.cos(th) }
        const per = { x: dir.z, z: -dir.x }
        const lat = (c.r + PLAYER_R) * offsetFrac
        let x = c.x - dir.x * 2.5 + per.x * lat
        let z = c.z - dir.z * 2.5 + per.z * lat
        if (Math.hypot(x, z) > bound) continue
        const x0 = x, z0 = z
        for (let i = 0; i < STEPS; i++) {
          x += dir.x * SPEED * DT; z += dir.z * SPEED * DT
          ;[x, z] = resolve(x, z, cols)
          const d = Math.hypot(x, z); if (d > bound) { x *= bound/d; z *= bound/d }
        }
        const along = (x - x0) * dir.x + (z - z0) * dir.z
        const frac = along / FREE
        buckets.n++
        if (frac < 0.15) buckets.blocked++
        else if (frac < 0.55) buckets.poor++
        else buckets.ok++
      }
    }
  }
  return buckets
}
for (const off of [0, 0.5, 0.8]) {
  const b = run(resolveCurrent, off)
  const lbl = off === 0 ? 'ישר במרכז' : `בזווית (סטייה ${off})`
  console.log(`${lbl.padEnd(22)} n=${b.n}  נחסם<15%: ${b.blocked} (${(100*b.blocked/b.n).toFixed(0)}%)  חלש<55%: ${b.poor} (${(100*b.poor/b.n).toFixed(0)}%)  זורם: ${b.ok} (${(100*b.ok/b.n).toFixed(0)}%)`)
}
