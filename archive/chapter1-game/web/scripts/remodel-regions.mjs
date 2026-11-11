/* Put the rebuilt props into the world, and stop every region using one shelf.
 *
 * Two complaints, one cause. "Broken models" was literal: the wall placed a
 * hundred and one times rendered as a heap of chips, the houses were roofless
 * open shells, the market shade was a modern patio table. And "every region
 * looks the same" followed from the same shelf being the only shelf — one wall,
 * one house, one way-house, everywhere from Yemen to Mecca.
 *
 * So this swaps each broken model for its rebuilt replacement AND spreads the
 * replacements out: three walls instead of one, four houses instead of two, and
 * the choice varies with position so a street is not the same house repeated.
 * Heights and collision radii are re-derived from the new meshes, because a
 * house that is now taller than it was would otherwise stand on the same
 * footprint and swallow its neighbour.
 *
 * Idempotent. Run: node scripts/remodel-regions.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'

const LIB = 'src/lib/chapter1/'
const MODELS = 'public/assets/chapter1/models/'

/** Measured size of a GLB, so heights and radii come from the mesh itself. */
function sizeOf(model) {
  const path = MODELS + model + '.glb'
  if (!existsSync(path)) return null
  const buf = readFileSync(path)
  let off = 12, json = null
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(off + 8, off + 8 + len).toString('utf8'))
    off += 8 + len
  }
  const mn = [Infinity, Infinity, Infinity]
  const mx = [-Infinity, -Infinity, -Infinity]
  for (const m of json.meshes ?? [])
    for (const p of m.primitives ?? []) {
      const a = json.accessors[p.attributes.POSITION]
      if (!a?.min) continue
      for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]) }
    }
  return { x: mx[0] - mn[0], y: mx[1] - mn[1], z: mx[2] - mn[2] }
}

const SIZE = {}
for (const m of ['drywall', 'drywall2', 'drywall3', 'house-a', 'house-b', 'house-c', 'house-d',
                 'house-e', 'house-f',
                 'crate', 'sackpile', 'awning', 'bigjar', 'waterskin', 'fodder', 'desert-bush', 'butte',
                 'bayt', 'bayt2'])
  SIZE[m] = sizeOf(m)

/* A deterministic pick, so the same prop in the same place always becomes the
   same replacement however many times this runs. */
const pick = (list, x, z) => list[Math.abs(Math.round(x * 7.3 + z * 3.1)) % list.length]

/* Deterministic like pick(), but it will not hand out a model that is already
   standing within twelve metres. Three of the same house in a row is what a
   street of six variants still looks like if you choose them independently. */
function spread(list, p, taken) {
  const near = taken.filter((t) => Math.hypot(t.x - p.x, t.z - p.z) < 12).map((t) => t.model)
  const start = Math.abs(Math.round(p.x * 7.3 + p.z * 3.1)) % list.length
  for (let i = 0; i < list.length; i++) {
    const m = list[(start + i) % list.length]
    if (!near.includes(m)) return m
  }
  return list[start]
}

const WALLS = ['drywall', 'drywall2', 'drywall3']
const HOUSES = ['house-a', 'house-b', 'house-c', 'house-d', 'house-e', 'house-f']

/** model → what it becomes, and the height it should be built at. */
const RULES = {
  /* Already-replaced houses are re-spread on a re-run, so adding a plan to
     HOUSES reaches the regions without re-authoring anything. */
  ...Object.fromEntries(HOUSES.map((m) => [m, (p, taken) => ({ model: spread(HOUSES, p, taken) })])),
  drywall: (p) => ({ model: pick(WALLS, p.x, p.z) }),
  ruinwall: (p) => ({ model: pick(WALLS, p.z, p.x) }),
  house2: (p, taken) => ({ model: spread(HOUSES, p, taken), h: 3.7 + (Math.abs(Math.round(p.x * 1.7)) % 4) * 0.45 }),
  wayhouse: (p, taken) => ({ model: spread(HOUSES, p, taken), h: 3.5 + (Math.abs(Math.round(p.z * 1.3)) % 4) * 0.5 }),
  /* r: 0 — shade is overhead, and a collision circle round it is an invisible
     drum standing in the middle of a market. */
  pergola: () => ({ model: 'awning', h: 2.5, r: 0 }),
  /* The old tent is nine metres long — a communal hall, not a household, and a
     ring of them does not fit in a night camp between the palms and the road.
     bayt is six by three and a half: one family, pitched with its back to the
     wind. */
  blacktent: (p) => ({ model: Math.abs(Math.round(p.x + p.z)) % 2 ? 'bayt' : 'bayt2', h: 2.05 }),
  'camel-load': (p) => ({ model: 'crate', h: 0.7 + (Math.abs(Math.round(p.x)) % 3) * 0.12 }),
}

/* Collision radius: the walkable footprint, not the bounding sphere. Taken as
   the smaller horizontal half-extent, so a long wall is not a wall-shaped bubble
   you cannot walk past the end of. */
function radiusFor(model, h) {
  const s = SIZE[model]
  if (!s) return null
  const k = h / s.y
  const half = Math.min(s.x, s.z) / 2 * k
  return +Math.max(0.35, half * 0.92).toFixed(2)
}

let total = 0
for (const file of readdirSync(LIB).filter((n) => n.endsWith('-layout.json'))) {
  const path = LIB + file
  const j = JSON.parse(readFileSync(path, 'utf8'))
  const counts = {}
  const taken = []
  for (const p of j.props) {
    const rule = RULES[p.model]
    if (!rule) continue
    const out = rule(p, taken)
    if (out.model.startsWith('house')) taken.push({ x: p.x, z: p.z, model: out.model })
    if (!SIZE[out.model]) continue
    const was = p.model
    p.model = out.model
    if (out.h) p.h = +out.h.toFixed(2)
    const r = out.r !== undefined ? out.r : radiusFor(p.model, p.h)
    if (r !== null && r !== undefined) p.r = r
    counts[was] = (counts[was] ?? 0) + 1
    total++
  }
  writeFileSync(path, JSON.stringify(j, null, 2) + '\n')
  const summary = Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(' ')
  console.log(`${file.replace('-layout.json', '').padEnd(14)} ${summary || '—'}`)
}
console.log(`\n${total} props re-modelled`)
