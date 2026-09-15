/* הסימולטור מריץ את *בדיוק* אלגוריתם ההתנגשות של Game.tsx מול ערכות
   הקוליידרים האמיתיות, ב-60fps — מה שרנדור headless ב-3fps לא יכול. */
import { layouts, ORDER, collidersOf } from '../scripts/route-sim.mjs'

const PLAYER_R = 0.45, SPEED = 2.6, DT = 1 / 60

/** האלגוריתם הקיים: דחיפה רדיאלית, שני מעברים, ללא החלקה */
function resolveCurrent(px, pz, cols) {
  for (let pass = 0; pass < 2; pass++) {
    let touched = false
    for (const c of cols) {
      const dx = px - c.x, dz = pz - c.z
      const d = Math.hypot(dx, dz)
      const min = c.r + PLAYER_R
      if (d < min) {
        touched = true
        if (d < 1e-4) px = c.x + min
        else { px = c.x + (dx / d) * min; pz = c.z + (dz / d) * min }
      }
    }
    if (!touched) break
  }
  return [px, pz]
}

function walk(cols, bound, start, dir, steps, resolve) {
  let x = start.x, z = start.z
  const path = [[x, z]]
  for (let i = 0; i < steps; i++) {
    x += dir.x * SPEED * DT; z += dir.z * SPEED * DT
    ;[x, z] = resolve(x, z, cols)
    const d = Math.hypot(x, z)
    if (d > bound) { x *= bound / d; z *= bound / d }
    path.push([x, z])
  }
  return path
}

function analyse(path) {
  let stalls = 0, osc = 0, travelled = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i-1][0], dz = path[i][1] - path[i-1][1]
    const s = Math.hypot(dx, dz)
    travelled += s
    if (s < 0.002) stalls++
    if (i > 2) {
      const px = path[i-1][0] - path[i-2][0], pz = path[i-1][1] - path[i-2][1]
      if (px * dx + pz * dz < 0 && s > 0.004 && Math.hypot(px, pz) > 0.004) osc++
    }
  }
  const net = Math.hypot(path.at(-1)[0] - path[0][0], path.at(-1)[1] - path[0][1])
  return { stalls, osc, travelled, net }
}

const DIRS = []
for (let a = 0; a < 16; a++) DIRS.push({ x: Math.sin(a * Math.PI / 8), z: Math.cos(a * Math.PI / 8) })

export function audit(resolve, label) {
  let totStuck = 0, totOsc = 0, totRuns = 0, worst = []
  for (const id of ORDER) {
    const L = layouts[id]
    const cols = collidersOf(L)
    const bound = (L.bound ?? 24) - 0.5
    let stuck = 0, oscRuns = 0, runs = 0
    /* מתחילים סביב כל קוליידר, בכל אחד מ-16 הכיוונים — 3 שניות הליכה */
    for (const c of cols) {
      for (const dir of DIRS) {
        const start = { x: c.x - dir.x * (c.r + PLAYER_R + 0.6), z: c.z - dir.z * (c.r + PLAYER_R + 0.6) }
        if (Math.hypot(start.x, start.z) > bound) continue
        const path = walk(cols, bound, start, dir, 180, resolve)
        const a = analyse(path)
        runs++
        /* „תקוע": הלך פחות מ-40 ס״מ בשלוש שניות של הליכה רצופה */
        if (a.net < 0.4) { stuck++; if (worst.length < 6) worst.push({ id, at: [+start.x.toFixed(1), +start.z.toFixed(1)], net: +a.net.toFixed(2) }) }
        if (a.osc > 8) oscRuns++
      }
    }
    totStuck += stuck; totOsc += oscRuns; totRuns += runs
    console.log(`  ${id.padEnd(15)} ${String(runs).padStart(5)} הליכות · תקוע ${String(stuck).padStart(4)} (${(100*stuck/runs).toFixed(1)}%) · מתנדנד ${String(oscRuns).padStart(4)}`)
  }
  console.log(`  ${label}: תקוע ${totStuck}/${totRuns} (${(100*totStuck/totRuns).toFixed(1)}%) · מתנדנד ${totOsc}`)
  return { totStuck, totOsc, totRuns, worst }
}

if (process.argv[2] === 'now') { console.log('— האלגוריתם הקיים —'); audit(resolveCurrent, 'קיים') }
export { resolveCurrent, walk, analyse, DIRS, PLAYER_R, SPEED, DT }
