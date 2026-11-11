/* Build each region out of the stone it actually stands on.
 *
 * Nine regions share one library of mud-brick houses, so Yathrib, Mecca, the
 * monastery and the frontier post were all built of the same material and read
 * as the same town four times. They were not: the Yemen highlands build in red
 * highland earth over dark basalt, a Byzantine foundation builds in pale
 * limestone, Yathrib's oasis brick is grey with river silt, and Mecca's is the
 * brown of the granite valley it sits in.
 *
 * The tint multiplies the model's own texture, so this keeps every brick, every
 * beam-end and every shadow the asset already has, and only changes what the
 * clay was made of. Idempotent.
 * Run: node scripts/local-stone.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const LIB = new URL('../src/lib/chapter1/', import.meta.url)

/** What is built of what, per region. `null` leaves the asset's own colour. */
const STONE = {
  'yemen-heights-layout.json': { built: '#d9a87c', wall: '#cdb69c', rock: '#c4a184' }, // red highland earth on basalt
  'camp-layout.json': { built: null, wall: null, rock: '#d8bb96' },                    // tents on sand
  'border-layout.json': { built: '#dcd6c6', wall: '#dad3c2', rock: '#cfc2ac' },        // frontier limestone
  'narrow-pass-layout.json': { built: '#c9b9a4', wall: '#cec0ab', rock: '#cfbba2' },   // dust over rock
  'loading-road-layout.json': { built: '#e6d4b2', wall: '#e0ceaf', rock: '#dcc7a4' },  // desert brick
  'yathrib-layout.json': { built: '#cdbca4', wall: '#cbbda7', rock: '#b7a58e' },       // dark harra stone
  'monastery-layout.json': { built: '#e2ded2', wall: '#dfdacc', rock: '#ccc6b6' },     // Byzantine limestone
  'mecca-layout.json': { built: '#c3b19d', wall: '#c5b39f', rock: '#b09a86' },         // the granite valley
  'exit-layout.json': { built: '#cbb9a3', wall: '#ccbba5', rock: '#bfa992' },
}

/* Walls were graded a full step darker than the buildings on the theory that
   dry stone is darker than plaster. It is — but these wall assets are already
   dark, and multiplying a dark texture by a dark tint turned the Yemen terraces
   into a line of black lumps across the hillside. The tint is a wash, not a
   shade: keep it close to the region's own brick. */
const BUILT = /house|wayhouse|mudtower|shrine|stall|pergola|gate-post/
const WALL = /drywall|ruinwall/
/* The photoscanned rocks came out of their scans cool and blue-grey, and in a
   warm desert region they read as a different game's assets dropped in. A rock
   belongs to the valley it sits in. */
const ROCK = /boulder|basalt|butte|mesa|rocks/

for (const f of readdirSync(new URL('.', LIB)).filter((n) => n.endsWith('-layout.json'))) {
  const rule = STONE[f]
  if (!rule) continue
  const path = new URL(f, LIB).pathname.slice(1)
  const j = JSON.parse(readFileSync(path, 'utf8'))
  let n = 0
  for (const p of j.props) {
    const t = BUILT.test(p.model) ? rule.built
      : WALL.test(p.model) ? rule.wall
      : ROCK.test(p.model) ? rule.rock
      : undefined
    if (t === undefined) continue
    if (t === null) { delete p.tint; continue }
    if (p.tint !== t) { p.tint = t; n++ }
  }
  writeFileSync(path, JSON.stringify(j, null, 2) + '\n')
  console.log(`${f.replace('-layout.json', '').padEnd(14)} ${n} props re-faced`)
}
