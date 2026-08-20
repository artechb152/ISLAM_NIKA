/* Can the chapter actually be walked?
 *
 * Every check I wrote before this one measured how the world photographs: props
 * don't overlap, encounters have anchors, exits sit inside the walkable circle.
 * All nine regions passed all of them, and the chapter was still impossible to
 * finish on foot — because nothing had ever asked the only question that
 * matters: standing where the road drops you, holding forward, do you reach the
 * next gate?
 *
 * This asks it. It rebuilds each region's colliders exactly the way the engine
 * does (props, the `collider` pseudo-props, the campfire circle), inflates them
 * by the player's radius, and runs a grid search from the arrival point through
 * every character who speaks there and on to the far gate. A region that fails
 * here cannot be played, whatever the screenshots look like.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'chapter1')

/* Kept in step with Game.tsx by name, not by import — this runs in plain node
   and the engine is TSX. Both numbers are asserted below. */
export const PLAYER_R = 0.45
export const TALK_RANGE = 3.6

const FILES = {
  'yemen-heights': 'yemen-heights-layout.json',
  'night-camp': 'camp-layout.json',
  'border-post': 'border-layout.json',
  'narrow-pass': 'narrow-pass-layout.json',
  'loading-road': 'loading-road-layout.json',
  yathrib: 'yathrib-layout.json',
  monastery: 'monastery-layout.json',
  mecca: 'mecca-layout.json',
  exit: 'exit-layout.json',
}
/** journey order, south to north — the itinerary the player walks */
export const ORDER = Object.keys(FILES)

export const layouts = Object.fromEntries(
  ORDER.map((id) => [id, JSON.parse(readFileSync(join(LIB, FILES[id]), 'utf8'))]),
)

/** Cast positions, read out of placements.ts without running TypeScript. */
export function readPlacements() {
  const src = readFileSync(join(LIB, 'placements.ts'), 'utf8')
  const body = src.slice(src.indexOf('PLACEMENTS: Record<string, Placement[]> = {'))
  const out = {}
  const re = /'?([a-z-]+)'?:\s*\[([^\]]*)\]/g
  let m
  while ((m = re.exec(body))) {
    const [, id, inner] = m
    if (!FILES[id]) continue
    out[id] = [...inner.matchAll(/\{\s*who:\s*'([a-z]+)',\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)].map(
      (p) => ({ who: p[1], x: +p[2], z: +p[3] }),
    )
  }
  return out
}

/** Exactly what buildWorld() puts in `colliders`. */
export function collidersOf(layout) {
  const solid = layout.props.filter((p) => p.model !== 'worn-patch' && p.r > 0)
  return [...solid.map((p) => ({ x: p.x, z: p.z, r: p.r, model: p.model })), { ...layout.campfire, model: 'campfire' }]
}

/** Where the traveller stands on arrival — entryPoint() in Game.tsx. */
export function entryPoint(layout, from) {
  const spawn = layout.player ?? { x: 0, z: 4 }
  const gate = from && layout.exits?.find((e) => e.to === from)
  if (!gate) return { x: spawn.x, z: spawn.z, yaw: 0 }
  const d = Math.hypot(gate.x, gate.z) || 1
  const inward = gate.r + 2.2
  return {
    x: +(gate.x - (gate.x / d) * inward).toFixed(2),
    z: +(gate.z - (gate.z / d) * inward).toFixed(2),
    yaw: Math.atan2(-gate.x, gate.z),
  }
}

/* ---- walkability grid --------------------------------------------------- */

const CELL = 0.35

/** A* across the region's free sand. Returns the path, or null if walled off. */
export function route(layout, from, to, extraClear = 0) {
  const bound = layout.bound ?? 24
  const cols = collidersOf(layout)
  const n = Math.ceil((bound * 2) / CELL)
  const idx = (i, j) => j * n + i
  const xy = (i, j) => ({ x: -bound + i * CELL, z: -bound + j * CELL })
  const free = new Uint8Array(n * n)
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const p = xy(i, j)
      if (Math.hypot(p.x, p.z) > bound - 0.5) continue
      let ok = 1
      for (const c of cols) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + PLAYER_R + extraClear) { ok = 0; break }
      free[idx(i, j)] = ok
    }
  const cellOf = (p) => ({ i: Math.round((p.x + bound) / CELL), j: Math.round((p.z + bound) / CELL) })
  /* The traveller can legitimately arrive standing half inside a prop's
     footprint — the engine pushes them out on the next frame. So a blocked
     start/goal is nudged to the nearest free cell rather than failing. */
  const snap = (p) => {
    const c = cellOf(p)
    if (free[idx(c.i, c.j)]) return c
    for (let r = 1; r < 40; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
          const i = c.i + di, j = c.j + dj
          if (i < 0 || j < 0 || i >= n || j >= n) continue
          if (free[idx(i, j)]) return { i, j }
        }
    return null
  }
  const s = snap(from), g = snap(to)
  if (!s || !g) return null
  const start = idx(s.i, s.j), goal = idx(g.i, g.j)
  const gScore = new Float32Array(n * n).fill(Infinity)
  const came = new Int32Array(n * n).fill(-1)
  gScore[start] = 0
  const h = (k) => {
    const i = k % n, j = (k / n) | 0
    return Math.hypot(i - g.i, j - g.j) * CELL
  }
  const open = [[h(start), start]]
  const seen = new Uint8Array(n * n)
  while (open.length) {
    open.sort((a, b) => a[0] - b[0])
    const [, k] = open.shift()
    if (seen[k]) continue
    seen[k] = 1
    if (k === goal) break
    const i = k % n, j = (k / n) | 0
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue
        const ni = i + di, nj = j + dj
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue
        const nk = idx(ni, nj)
        if (!free[nk] || seen[nk]) continue
        const step = Math.hypot(di, dj) * CELL
        if (gScore[k] + step < gScore[nk]) {
          gScore[nk] = gScore[k] + step
          came[nk] = k
          open.push([gScore[nk] + h(nk), nk])
        }
      }
  }
  if (!seen[goal]) return null
  const path = []
  for (let k = goal; k !== -1; k = came[k]) path.push(xy(k % n, (k / n) | 0))
  return { path: path.reverse(), length: gScore[goal] }
}

/** The legs the player must walk here: arrival → each speaker → the far gate. */
export function legsOf(id, placements) {
  const layout = layouts[id]
  const back = ORDER[ORDER.indexOf(id) - 1]
  const fwd = ORDER[ORDER.indexOf(id) + 1]
  const start = entryPoint(layout, back)
  const stops = (placements[id] ?? []).map((p) => ({ name: p.who, x: p.x, z: p.z, talk: true }))
  const exitGate = fwd && layout.exits?.find((e) => e.to === fwd)
  const legs = []
  let at = start
  for (const s of stops) { legs.push({ from: at, to: s, name: `→ ${s.who ?? s.name}` }); at = s }
  if (exitGate) legs.push({ from: at, to: exitGate, name: `→ שער ${fwd}` })
  return { start, legs, exitGate, fwd, back }
}

/* ---- walking it, not just proving a path exists -------------------------- */

/* A* proves a corridor is there. It does not prove a person finds it. This runs
   the engine's own movement — same speed, same 0.45 m body, same two-pass
   push-out, same walkable circle — with a traveller who simply steers at
   whatever they are heading for and keeps walking. If that traveller arrives,
   the route is legible; if they grind against a wall for ninety seconds, the
   route exists only for the pathfinder. */
export function walkLeg(layout, from, to, arriveAt = 1.6, seconds = 90) {
  const cols = collidersOf(layout)
  const bound = layout.bound ?? 24
  const SPEED = 2.6
  const TURN = 3.2
  const dt = 1 / 60
  let x = from.x, z = from.z
  let yaw = Math.atan2(to.x - x, -(to.z - z))
  let stuckFor = 0
  let travelled = 0
  for (let t = 0; t < seconds / dt; t++) {
    const d = Math.hypot(to.x - x, to.z - z)
    if (d < arriveAt) return { ok: true, seconds: t * dt, travelled }
    /* steer toward the objective, at a human turn rate */
    const want = Math.atan2(to.x - x, -(to.z - z))
    let delta = ((want - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    yaw += Math.max(-TURN * dt, Math.min(TURN * dt, delta))
    const px = x, pz = z
    x += Math.sin(yaw) * SPEED * dt
    z += -Math.cos(yaw) * SPEED * dt
    for (let pass = 0; pass < 2; pass++)
      for (const c of cols) {
        const dx = x - c.x, dz = z - c.z
        const dd = Math.hypot(dx, dz)
        const min = c.r + PLAYER_R
        if (dd < min) {
          if (dd < 1e-4) x = c.x + min
          else { x = c.x + (dx / dd) * min; z = c.z + (dz / dd) * min }
        }
      }
    const rad = Math.hypot(x, z)
    if (rad > bound) { x *= bound / rad; z *= bound / rad }
    const step = Math.hypot(x - px, z - pz)
    travelled += step
    /* pressed into something and going nowhere: a player would turn, so let
       them — a small nudge sideways, the way you shuffle along a wall */
    if (step < SPEED * dt * 0.35) {
      stuckFor += dt
      yaw += (stuckFor > 1.2 ? 1 : -1) * 2.4 * dt
    } else stuckFor = Math.max(0, stuckFor - dt)
    if (stuckFor > 6) return { ok: false, reason: 'stuck against geometry', seconds: t * dt, travelled, at: { x, z } }
  }
  return { ok: false, reason: 'never arrived', seconds, travelled, at: { x, z } }
}
