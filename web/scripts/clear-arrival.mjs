/* You should be able to see where you are when you arrive.
 *
 * The traveller is put down a couple of metres inside the gate they walked in
 * by, facing the middle of the region. In Mecca that lands them in a slot
 * between two houses, and the first thing the city says for itself is two blank
 * walls filling the screen — a region's opening shot, spent on masonry.
 *
 * This pushes built things out of a wedge in front of the arrival point: wide
 * enough to see down, deep enough to show what the place is, and only as far as
 * the nearest interesting thing. Nothing is deleted — buildings step aside, the
 * way they would have been placed in the first place if anyone had stood there
 * and looked.
 *
 * Idempotent. Run: node scripts/clear-arrival.mjs
 * Then: node scripts/unstack-buildings.mjs && npm run verify
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { layouts, ORDER, entryPoint } from './route-sim.mjs'

const LIB = 'src/lib/chapter1/'
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

/** Only things you cannot see past. A palm or a jar in the view is the view. */
const BULKY = /^(house-|wayhouse|mudtower|kaaba|bayt|blacktent|butte|basalt|boulder)/

const DEPTH = 22      // how far ahead the view is kept open, in metres
/* Half-width at the far end. Wide enough to open a street, not so wide that
   clearing it would gut the town — a city you arrive INSIDE is a city, and
   two houses either side of the road are what that looks like. */
const HALF = 8.5

let moved = 0
for (const id of ORDER) {
  const path = LIB + FILES[id]
  if (!existsSync(path)) continue
  const j = JSON.parse(readFileSync(path, 'utf8'))
  const back = ORDER[ORDER.indexOf(id) - 1]
  const at = entryPoint(j, back)
  /* forward at yaw y is (sin y, −cos y) */
  const fx = Math.sin(at.yaw)
  const fz = -Math.cos(at.yaw)
  const rx = Math.cos(at.yaw)      // and right is (cos y, sin y)
  const rz = Math.sin(at.yaw)
  const bound = j.bound ?? 24
  const here = []

  for (const p of j.props) {
    if (!BULKY.test(p.model)) continue
    const dx = p.x - at.x
    const dz = p.z - at.z
    const ahead = dx * fx + dz * fz
    if (ahead < 1.5 || ahead > DEPTH) continue
    /* the wedge opens as it goes, so what is close has to be well clear and
       what is far away only has to be off the middle */
    const width = 2.6 + (ahead / DEPTH) * (HALF - 2.6)
    const side = dx * rx + dz * rz
    if (Math.abs(side) > width) continue
    const push = (width + 0.4 - Math.abs(side)) * (side >= 0 ? 1 : -1)
    const nx = +(p.x + rx * push).toFixed(2)
    const nz = +(p.z + rz * push).toFixed(2)
    if (Math.hypot(nx, nz) > bound + 20) continue      // do not shove it off the world
    here.push(`${p.model} ${p.x},${p.z} → ${nx},${nz}`)
    p.x = nx
    p.z = nz
    moved++
  }
  if (here.length) {
    writeFileSync(path, JSON.stringify(j, null, 2) + '\n')
    console.log(`${id.padEnd(14)} ${here.length} stepped out of the way`)
    for (const h of here) console.log(`    ${h}`)
  } else console.log(`${id.padEnd(14)} the view is already open`)
}
console.log(moved ? `\n${moved} moved` : '\nnothing needed moving')
