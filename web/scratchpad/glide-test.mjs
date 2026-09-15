/* התיקון המוצע, נמדד מול הקיים — ובעיקר: האם הוא פורץ מכשולים? */
import { layouts, ORDER, collidersOf } from '../scripts/route-sim.mjs'
const PLAYER_R = 0.45, SPEED = 2.6, DT = 1/60, STEPS = 180
const FREE = SPEED * DT * STEPS

function depenetrate(px, pz, cols, passes, acc) {
  for (let pass = 0; pass < passes; pass++) {
    let touched = false
    for (const c of cols) {
      const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz), min = c.r + PLAYER_R
      if (d < min) {
        touched = true
        if (d < 1e-4) px = c.x + min
        else {
          if (acc) { acc.x += (dx/d) * (min - d); acc.z += (dz/d) * (min - d) }
          px = c.x + (dx/d)*min; pz = c.z + (dz/d)*min
        }
      }
    }
    if (!touched) break
  }
  return [px, pz]
}
const current = (px, pz, cols) => depenetrate(px, pz, cols, 2, null)

/** מהלך פריים שלם עם החלקה סביב פינות */
function stepGlide(x, z, dx, dz, cols) {
  const sx = x, sz = z
  x += dx; z += dz
  const acc = { x: 0, z: 0 }
  ;[x, z] = depenetrate(x, z, cols, 4, acc)
  const len = Math.hypot(dx, dz) || 1e-9
  const ux = dx / len, uz = dz / len
  const got = (x - sx) * ux + (z - sz) * uz
  const nl = Math.hypot(acc.x, acc.z)
  if (nl > 1e-6 && got < len * 0.6) {
    const nx = acc.x / nl, nz = acc.z / nl
    let tx = -nz, tz = nx
    if (tx * ux + tz * uz < 0) { tx = -tx; tz = -tz }
    const give = (len - Math.max(0, got)) * 0.85
    x += tx * give; z += tz * give
    ;[x, z] = depenetrate(x, z, cols, 4, null)
    /* ההסטה מסיטה את הצעד, לא מאריכה אותו: תזוזת הפריים לעולם אינה
       גדולה מן הצעד המבוקש, ולכן אי אפשר לעבור דרך מכשול. */
    const mx = x - sx, mz = z - sz, ml = Math.hypot(mx, mz)
    if (ml > len) { x = sx + mx / ml * len; z = sz + mz / ml * len
      ;[x, z] = depenetrate(x, z, cols, 4, null) }
  }
  return [x, z]
}

function walk(cols, bound, x, z, dir, resolveStep) {
  const start = { x, z }
  let worstPen = 0
  for (let i = 0; i < STEPS; i++) {
    ;[x, z] = resolveStep(x, z, dir.x*SPEED*DT, dir.z*SPEED*DT, cols)
    const d = Math.hypot(x, z); if (d > bound) { x *= bound/d; z *= bound/d }
    for (const c of cols) {
      const pen = c.r + PLAYER_R - Math.hypot(x - c.x, z - c.z)
      if (pen > worstPen) worstPen = pen
    }
  }
  return { along: (x-start.x)*dir.x + (z-start.z)*dir.z, worstPen }
}
const stepPlain = (x, z, dx, dz, cols) => current(x + dx, z + dz, cols)

function report(label, resolveStep) {
  for (const off of [0, 0.5]) {
    let blocked = 0, poor = 0, ok = 0, n = 0, maxPen = 0
    for (const id of ORDER) {
      const L = layouts[id], cols = collidersOf(L), bound = (L.bound ?? 24) - 0.5
      for (const c of cols) {
        if (c.r < 0.3) continue
        for (let a = 0; a < 8; a++) {
          const th = a*Math.PI/4, dir = { x: Math.sin(th), z: Math.cos(th) }
          const per = { x: dir.z, z: -dir.x }, lat = (c.r + PLAYER_R) * off
          const x = c.x - dir.x*2.5 + per.x*lat, z = c.z - dir.z*2.5 + per.z*lat
          if (Math.hypot(x, z) > bound) continue
          const r = walk(cols, bound, x, z, dir, resolveStep)
          if (r.worstPen > maxPen) maxPen = r.worstPen
          const f = r.along / FREE; n++
          if (f < 0.15) blocked++; else if (f < 0.55) poor++; else ok++
        }
      }
    }
    console.log(`${label} · ${off===0?'ישר במרכז ':'בזווית    '} n=${n} נחסם ${(100*blocked/n).toFixed(0)}% חלש ${(100*poor/n).toFixed(0)}% זורם ${(100*ok/n).toFixed(0)}% · חדירה מרבית ${maxPen.toFixed(4)}מ׳`)
  }
}
report('קיים ', stepPlain)
report('מתוקן', stepGlide)
