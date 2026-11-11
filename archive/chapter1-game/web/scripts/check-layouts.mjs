/* Spacing guard for all nine regions, not just the camp.
 *
 * check-camp.mjs has always covered exactly one layout — the night camp — which
 * was fine when the camp was the whole world. Eight regions were authored since
 * with nothing checking them, and Mecca ended up with houses four metres apart
 * that each measure six across: every collision test passed and the walls went
 * through each other.
 *
 * Uses each model's MEASURED footprint, and only where measuring means
 * something: buildings must not grow through buildings or through the big
 * rocks, and nothing may stand on top of somebody you have to talk to. Walls
 * are exempt — a wall's whole job is to abut its neighbour — and so are rocks
 * against rocks, because a pile of boulders is meant to pile.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { radiusAt } from './measure-props.mjs'
import { layouts, ORDER, readPlacements } from './route-sim.mjs'

const BUILT = /house|wayhouse|mudtower|shrine|kaaba|stall|pergola/
const BULK = /boulder|butte|mesa|basalt/
/* A wall meeting a wall is a wall. A building meeting a building is a mistake.
   A building against a boulder is neither, and it cannot be judged the same
   way: the photoscanned rocks that wall the narrow pass measure ten to eighteen
   metres across as bounding spheres, so by measured footprint there is nowhere
   in that region a tower could legally stand. Against rock, the layout's own
   collision radius is the honest number — it is what the author drew round the
   part of the lump you can actually walk into. */
const SHARE_BUILT = 0.94

const footprint = (p) => {
  if (p.model === 'palm') return 0.9
  if (!existsSync(`public/assets/chapter1/models/${p.model}.glb`)) return p.r
  return Math.max(p.r, radiusAt(p.model + '.glb', p.h)?.radius ?? p.r)
}

const placements = readPlacements()
const problems = []
for (const id of ORDER) {
  const L = layouts[id]
  const BOUND = L.bound ?? 24
  const near = L.props.filter((p) => p.r > 0 && Math.hypot(p.x, p.z) < BOUND + 25)
  const sized = near.map((p) => ({ ...p, s: footprint(p) }))
  const built = sized.filter((p) => BUILT.test(p.model))
  for (const a of built)
    for (const b of sized) {
      if (a === b) continue
      if (!BUILT.test(b.model) && !BULK.test(b.model)) continue
      const need = BUILT.test(b.model) ? (a.s + b.s) * SHARE_BUILT : a.s * 0.75 + b.r
      const d = Math.hypot(a.x - b.x, a.z - b.z)
      if (d >= need) continue
      /* report each pair once */
      if (BUILT.test(b.model) && (a.x < b.x || (a.x === b.x && a.z < b.z))) continue
      problems.push(`${id}: ${a.model}(${a.x},${a.z}) grows ${(need - d).toFixed(1)} m into ${b.model}(${b.x},${b.z})`)
    }
  /* and nobody you have to talk to is buried under anything */
  for (const c of placements[id] ?? [])
    for (const p of sized) {
      const d = Math.hypot(c.x - p.x, c.z - p.z)
      if (d < p.s * 0.8) problems.push(`${id}: ${c.who} stands inside ${p.model}(${p.x},${p.z})`)
    }
}

if (problems.length) {
  console.log(`\n✗ פריסת האזורים — ${problems.length} בעיות:\n`)
  for (const p of problems.slice(0, 20)) console.log('  • ' + p)
  if (problems.length > 20) console.log(`  … ועוד ${problems.length - 20}`)
  process.exit(1)
}
console.log(`✓ פריסת תשעת האזורים תקינה — אין מבנים שגדלים זה בתוך זה, ואיש מהדמויות אינו קבור בתוך חפץ.`)
