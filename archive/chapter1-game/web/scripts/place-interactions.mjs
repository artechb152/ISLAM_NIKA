/* Put every piece of evidence and every task station on ground that exists.
 *
 * The spots in finds.ts and tasks.ts were written by reading a layout file,
 * which is a good way to land a coin inside a tent. This nudges each one to the
 * nearest place that is genuinely clear of every prop, inside the walkable
 * circle, and reachable on foot from where the traveller arrives — and, for the
 * evidence, near enough to the route that it is found by looking around rather
 * than by sweeping the map.
 *
 * Writes the coordinates back into the two data files. Idempotent: an item that
 * already stands somewhere legal is left exactly where the author put it.
 *
 * Run: node scripts/place-interactions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { layouts, ORDER, collidersOf, entryPoint, route } from './route-sim.mjs'

const LIB = 'src/lib/chapter1/'

/** Every item's id, region and current spot, from the source of the data file. */
function read(file, kind) {
  const text = readFileSync(LIB + file, 'utf8')
  const re = /id:\s*'([^']+)',\s*\n\s*region:\s*'([^']+)',\s*\n\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+),/g
  return [...text.matchAll(re)].map((m) => ({ id: m[1], region: m[2], x: +m[3], z: +m[4], kind }))
}

/** Is this a spot a person can stand, see, and reach? */
function legal(item, clearance) {
  const L = layouts[item.region]
  const bound = L.bound ?? 24
  if (Math.hypot(item.x, item.z) > bound - 2.5) return false
  for (const c of collidersOf(L)) if (Math.hypot(item.x - c.x, item.z - c.z) < c.r + clearance) return false
  const back = ORDER[ORDER.indexOf(item.region) - 1]
  return !!route(L, entryPoint(L, back), item, 0.4)
}

const moved = []
for (const [file, kind, clearance] of [['finds.ts', 'עדות', 0.75], ['tasks.ts', 'משימה', 1.1]]) {
  let text = readFileSync(LIB + file, 'utf8')
  for (const item of read(file, kind)) {
    if (legal(item, clearance)) continue
    /* spiral outward from where the author wanted it, so the object stays in
       the part of the region it was written for */
    let best = null
    for (let r = 0.5; r <= 14 && !best; r += 0.5)
      for (let a = 0; a < 32; a++) {
        const t = (a / 32) * Math.PI * 2
        const cand = { ...item, x: +(item.x + Math.cos(t) * r).toFixed(2), z: +(item.z + Math.sin(t) * r).toFixed(2) }
        if (legal(cand, clearance)) { best = cand; break }
      }
    if (!best) { console.log(`  ✗ ${item.id}: nowhere clear within 14 m`); continue }
    const from = `id: '${item.id}',\n    region: '${item.region}',\n    x: ${item.x}, z: ${item.z},`
    const to = `id: '${item.id}',\n    region: '${item.region}',\n    x: ${best.x}, z: ${best.z},`
    if (!text.includes(from)) { console.log(`  ✗ ${item.id}: could not rewrite (source shape changed)`); continue }
    text = text.replace(from, to)
    moved.push(`${item.kind} ${item.id}: ${item.x},${item.z} → ${best.x},${best.z}`)
  }
  writeFileSync(LIB + file, text)
}

for (const m of moved) console.log('  ' + m)
console.log(moved.length ? `\n${moved.length} moved onto clear ground` : 'everything already stands somewhere legal')
