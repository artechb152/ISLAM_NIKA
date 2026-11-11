/* How far does one loop of the walk clip actually carry a foot?
 *
 * The player's clip rate was `1.43 * sqrt(gait)`. Ground speed is linear in
 * gait, so a square root can agree with it at exactly one speed — and the feet
 * skate everywhere else. The camel beside him has had it right the whole time:
 * `groundSpeed / 1.24`, a cycle length in metres.
 *
 * To write the same law for the player you need his cycle length, and guessing
 * it is how the last round of tuning went wrong. This reads it out of the GLB:
 * for an in-place walk the planted foot travels backwards under the hips at
 * exactly the speed the ground should be moving, so the distance a foot covers
 * from its most-forward to its most-backward point is one step, and two steps
 * are one loop of the clip.
 *
 *   node scripts/measure-walk.mjs [path-to.glb]
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const FILE = process.argv[2] || join(HERE, '..', 'public/assets/chapter1/models/traveler-anim.glb')

function readGLB(path) {
  const buf = readFileSync(path)
  let off = 12, json = null, bin = null
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    const d = buf.subarray(off + 8, off + 8 + len)
    if (type === 0x4e4f534a) json = JSON.parse(d.toString('utf8'))
    else if (bin === null) bin = d
    off += 8 + len
  }
  return { json, bin }
}

const { json, bin } = readGLB(FILE)

const view = (i) => {
  const bv = json.bufferViews[i]
  return bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)
}
const COMP = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array, 5122: Int16Array }
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
function accessor(i) {
  const a = json.accessors[i]
  const n = NUM[a.type]
  const Ctor = COMP[a.componentType]
  const raw = view(a.bufferView)
  const arr = new Ctor(raw.buffer, raw.byteOffset + (a.byteOffset ?? 0), a.count * n)
  const out = []
  for (let k = 0; k < a.count; k++) out.push(Array.from(arr.slice(k * n, k * n + n)))
  return out
}

const nodeName = (i) => json.nodes[i]?.name ?? `node${i}`

console.log(`\n${FILE.split(/[\\/]/).pop()}\n`)
console.log(`  clips: ${(json.animations ?? []).map((a) => a.name).join(', ') || '(none)'}`)

/* how the model is scaled at runtime: fitToGround normalises the figure to
   1.78 m, so raw clip distances have to be scaled the same way */
const REAL_HEIGHT = 1.78

for (const anim of json.animations ?? []) {
  const times = []
  let dur = 0
  /* every translation track, so we can find the feet whatever they are called */
  const tracks = []
  for (const ch of anim.channels) {
    if (ch.target.path !== 'translation') continue
    const s = anim.samplers[ch.sampler]
    const t = accessor(s.input).map((v) => v[0])
    const v = accessor(s.output)
    dur = Math.max(dur, t[t.length - 1])
    tracks.push({ node: nodeName(ch.target.node), t, v })
    times.push(...t)
  }
  console.log(`\n  ── ${anim.name}  (${dur.toFixed(3)}s, ${tracks.length} translation tracks)`)
  const feet = tracks.filter((tr) => /foot|toe|ankle|leg/i.test(tr.node))
  const pool = feet.length ? feet : tracks
  if (!pool.length) { console.log('     no translation tracks — the clip is rotation-only'); continue }

  let best = null
  for (const tr of pool) {
    /* the horizontal axis with the biggest swing is the direction of travel */
    for (const axis of [0, 2]) {
      const vals = tr.v.map((p) => p[axis])
      const swing = Math.max(...vals) - Math.min(...vals)
      if (!best || swing > best.swing) best = { node: tr.node, axis, swing }
    }
  }
  const axisName = best.axis === 0 ? 'X' : 'Z'
  console.log(`     widest swing: ${best.node} on ${axisName} = ${best.swing.toFixed(4)} model units`)
  console.log(`     one step  ≈ ${best.swing.toFixed(4)}   one loop (2 steps) ≈ ${(best.swing * 2).toFixed(4)}`)
  console.log(`     if the rig is authored in metres at ~${REAL_HEIGHT} m, cycle ≈ ${(best.swing * 2).toFixed(3)} m`)
}

console.log(`
  NOTE: a rotation-only clip (Mixamo rigs usually are — only the hips
  translate) cannot be measured this way, and the number to trust is then the
  one the walk was tuned to by eye. The law still has to be linear:
      timeScale = groundSpeed / CYCLE_METRES
  Anchor CYCLE_METRES at the speed the look was signed off at.
`)
