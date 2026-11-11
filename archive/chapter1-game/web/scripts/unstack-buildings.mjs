/* Stop the buildings growing through each other.
 *
 * Layouts were authored against each prop's hand-written collision radius, which
 * is a circle drawn for walking into — always smaller than the thing itself. Two
 * mud-brick houses can sit four and a half metres apart and pass every collision
 * check while visibly interpenetrating, and Mecca had dozens of those.
 *
 * This relaxes only the built things — houses, towers, way-houses, the shrine —
 * against each other and against the big rocks, using each model's MEASURED
 * footprint. Walls are left alone on purpose: a wall's whole job is to abut its
 * neighbour, and rocks are left alone because a pile of boulders is meant to
 * pile. Nothing moves more than a couple of metres, and nothing crosses the
 * walkable boundary.
 * Run: node scripts/unstack-buildings.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { radiusAt } from './measure-props.mjs'

const LIB = new URL('../src/lib/chapter1/', import.meta.url)
const BUILT = /house|wayhouse|mudtower|shrine|kaaba|stall/
const BULK = /boulder|butte|mesa|basalt/

const footprint = (p) => {
  const f = `public/assets/chapter1/models/${p.model}.glb`
  if (!existsSync(f)) return p.r
  return Math.max(p.r, radiusAt(p.model + '.glb', p.h)?.radius ?? p.r)
}

for (const file of readdirSync(new URL('.', LIB)).filter((n) => n.endsWith('-layout.json'))) {
  const path = new URL(file, LIB).pathname.slice(1)
  const j = JSON.parse(readFileSync(path, 'utf8'))
  const BOUND = j.bound ?? 24
  const all = j.props.filter((p) => p.r > 0 && Math.hypot(p.x, p.z) < BOUND + 25)
  const built = all.filter((p) => BUILT.test(p.model))
  const bulk = all.filter((p) => BULK.test(p.model))
  if (!built.length) { console.log(`${file.replace('-layout.json', '').padEnd(14)} —`); continue }
  const s = new Map(all.map((p) => [p, footprint(p)]))
  const start = built.map((p) => ({ x: p.x, z: p.z }))

  for (let pass = 0; pass < 300; pass++) {
    let moved = 0
    for (const a of built) {
      for (const b of [...built, ...bulk]) {
        if (a === b) continue
        const need = (s.get(a) + s.get(b)) * 0.97   // aim past the 0.94 the check uses, so relaxation settles clear of it rather than exactly on it
        const dx = a.x - b.x, dz = a.z - b.z
        const d = Math.hypot(dx, dz) || 0.01
        if (d >= need) continue
        /* only the built thing gives way when the other is a rock */
        const share = BUILT.test(b.model) ? 0.5 : 1
        const push = (need - d) * share + 0.01
        a.x += (dx / d) * push
        a.z += (dz / d) * push
        if (share === 0.5) { b.x -= (dx / d) * push; b.z -= (dz / d) * push }
        moved++
      }
      const r = Math.hypot(a.x, a.z)
      if (r > BOUND + 22) { a.x *= (BOUND + 22) / r; a.z *= (BOUND + 22) / r }
    }
    if (!moved) break
  }
  let n = 0, far = 0
  built.forEach((p, i) => {
    const d = Math.hypot(p.x - start[i].x, p.z - start[i].z)
    if (d < 0.02) return
    n++
    far = Math.max(far, d)
    p.x = +p.x.toFixed(2)
    p.z = +p.z.toFixed(2)
  })
  writeFileSync(path, JSON.stringify(j, null, 2) + '\n')
  console.log(`${file.replace('-layout.json', '').padEnd(14)} ${n} of ${built.length} buildings moved, furthest ${far.toFixed(1)} m`)
}
