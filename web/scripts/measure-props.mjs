/* Measures the real ground footprint of every chapter-1 model.

   The camp layout guard used hand-guessed radii, which let elongated models
   (the tent especially) overlap while every circle test still passed. This
   walks each GLB's node tree, applies the node transforms, and reports the
   footprint radius the model actually needs at a given height.

   Run: node scripts/measure-props.mjs */

import { readFileSync } from 'node:fs'

const DIR = new URL('../public/assets/chapter1/models/', import.meta.url)

function readGLB(name) {
  const b = readFileSync(new URL(name, DIR))
  const jsonLen = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString())
  return json
}

/* --- minimal 4x4 maths, column-major like glTF --- */
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
function mul(a, b) {
  const o = new Array(16).fill(0)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
function trs(node) {
  if (node.matrix) return node.matrix
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz
  const xx = qx * x2, xy = qx * y2, xz = qx * z2
  const yy = qy * y2, yz = qy * z2, zz = qz * z2
  const wx = qw * x2, wy = qw * y2, wz = qw * z2
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]
}
const apply = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
]

export function measure(file) {
  const json = readGLB(file)
  const mn = [Infinity, Infinity, Infinity]
  const mx = [-Infinity, -Infinity, -Infinity]
  const scene = json.scenes?.[json.scene ?? 0]
  const walk = (idx, parent) => {
    const node = json.nodes[idx]
    const world = mul(parent, trs(node))
    if (node.mesh !== undefined) {
      for (const prim of json.meshes[node.mesh].primitives) {
        const acc = json.accessors[prim.attributes.POSITION]
        if (!acc?.min) continue
        // transform all eight corners of the primitive's local box
        for (let c = 0; c < 8; c++) {
          const p = [c & 1 ? acc.max[0] : acc.min[0], c & 2 ? acc.max[1] : acc.min[1], c & 4 ? acc.max[2] : acc.min[2]]
          const w = apply(world, p)
          for (let i = 0; i < 3; i++) {
            if (w[i] < mn[i]) mn[i] = w[i]
            if (w[i] > mx[i]) mx[i] = w[i]
          }
        }
      }
    }
    for (const ch of node.children ?? []) walk(ch, world)
  }
  for (const r of scene.nodes) walk(r, ident())
  return { size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] }
}

/** footprint radius the model needs when scaled to `height` metres */
export function radiusAt(file, height) {
  const { size } = measure(file)
  if (!(size[1] > 0)) return null
  const s = height / size[1]
  const w = size[0] * s
  const d = size[2] * s
  return { w, d, radius: Math.hypot(w, d) / 2 }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.includes('measure-props')) {
  const src = readFileSync(new URL('../src/components/chapter1/Game.tsx', import.meta.url), 'utf8')
  const paths = Object.fromEntries(
    [...src.matchAll(/const (MODEL_\w+) = '\/assets\/chapter1\/models\/([\w.-]+)'/g)].map((m) => [m[1], m[2]]),
  )
  const rows = [...src.matchAll(/\{ url: (MODEL_\w+), x: (-?[\d.]+), z: (-?[\d.]+), ry: (-?[\d.]+), h: ([\d.]+), r: ([\d.]+) \}/g)]
  const seen = new Set()
  console.log('model'.padEnd(16), 'h'.padStart(5), 'w×d'.padStart(13), 'needs r'.padStart(9), 'declared'.padStart(9))
  for (const m of rows) {
    const key = m[1] + m[5]
    if (seen.has(key)) continue
    seen.add(key)
    const f = paths[m[1]]
    if (!f) continue
    const r = radiusAt(f, +m[5])
    if (!r) continue
    const flag = +m[6] + 0.05 < r.radius ? '  ← too small' : ''
    console.log(
      m[1].padEnd(16),
      m[5].padStart(5),
      `${r.w.toFixed(1)}×${r.d.toFixed(1)}`.padStart(13),
      r.radius.toFixed(2).padStart(9),
      m[6].padStart(9),
      flag,
    )
  }
}
