/* What is actually wrong with each model, read out of the GLB itself.
 *
 * "Broken models" and "everything is grey" are two symptoms of a short list of
 * concrete faults, and every one of them is visible in the file without opening
 * Blender: a material with no texture renders as flat plastic; a baseColor
 * texture bound to UV set 1 renders white on a mesh that only has UV set 0;
 * a metallic surface mirrors the sky panorama; a texture whose pixels are all
 * one colour is a bake that failed. This lists them per model, worst first.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import sharp from 'sharp'

const DIR = 'public/assets/chapter1/models/'
const LIB = 'src/lib/chapter1/'

/** Which models the nine regions actually stand on. */
const used = new Map()
for (const f of readdirSync(LIB).filter((n) => n.endsWith('-layout.json'))) {
  const j = JSON.parse(readFileSync(LIB + f, 'utf8'))
  for (const p of j.props) {
    if (p.model === 'collider' || p.model === 'worn-patch') continue
    used.set(p.model, (used.get(p.model) ?? 0) + 1)
  }
}

function readGLB(path) {
  const buf = readFileSync(path)
  let off = 12, json = null, bin = null
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    const d = buf.subarray(off + 8, off + 8 + len)
    if (type === 0x4e4f534a) json = JSON.parse(d.toString('utf8'))
    else bin = d
    off += 8 + len
  }
  return { json, bin }
}

const rows = []
for (const [model, count] of [...used].sort()) {
  const path = DIR + model + '.glb'
  if (!existsSync(path)) { rows.push({ model, count, faults: ['NO FILE'], score: 100 }); continue }
  const { json, bin } = readGLB(path)
  const faults = []
  let score = 0

  /* which UV sets each mesh actually has */
  const uvSets = new Set()
  let verts = 0
  for (const m of json.meshes ?? [])
    for (const p of m.primitives ?? []) {
      for (const k of Object.keys(p.attributes)) if (k.startsWith('TEXCOORD')) uvSets.add(k)
      verts += json.accessors[p.attributes.POSITION]?.count ?? 0
    }

  for (const mat of json.materials ?? []) {
    const pbr = mat.pbrMetallicRoughness ?? {}
    const tex = pbr.baseColorTexture
    if (!tex) {
      const f = pbr.baseColorFactor
      const grey = !f || (Math.abs(f[0] - f[1]) < 0.06 && Math.abs(f[1] - f[2]) < 0.06)
      faults.push(`"${mat.name ?? '?'}" has no texture${grey ? ' and a grey/white base colour' : ''}`)
      score += grey ? 10 : 5
    } else if ((tex.texCoord ?? 0) > 0 && !uvSets.has(`TEXCOORD_${tex.texCoord}`)) {
      faults.push(`"${mat.name}" reads UV set ${tex.texCoord}, which the mesh does not have — renders white`)
      score += 20
    }
    if ((pbr.metallicFactor ?? 1) > 0.08) { faults.push(`"${mat.name}" metallic ${pbr.metallicFactor ?? 1} — mirrors the sky`); score += 15 }
    for (const e of Object.keys(mat.extensions ?? {})) { faults.push(`"${mat.name}" carries ${e}`); score += 8 }
  }

  /* a texture that is one flat colour is a bake that did not take */
  for (let i = 0; i < (json.images ?? []).length; i++) {
    const im = json.images[i]
    if (im.bufferView == null) continue
    const bv = json.bufferViews[im.bufferView]
    const data = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)
    try {
      const { data: small, info } = await sharp(data).resize(16, 16, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      let min = [255, 255, 255], max = [0, 0, 0]
      for (let k = 0; k < small.length; k += 3)
        for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], small[k + c]); max[c] = Math.max(max[c], small[k + c]) }
      const range = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2])
      const mean = [0, 1, 2].map((c) => (min[c] + max[c]) / 2)
      const sat = Math.max(...mean) - Math.min(...mean)
      if (range < 14) { faults.push(`image ${i} is flat (range ${range}) — the bake did not take`); score += 12 }
      else if (sat < 10 && Math.max(...mean) > 40) { faults.push(`image ${i} is grey (saturation ${sat | 0})`); score += 6 }
      void info
    } catch { faults.push(`image ${i} could not be decoded`); score += 10 }
  }

  if (verts < 24) { faults.push(`only ${verts} vertices`); score += 6 }
  rows.push({ model, count, faults, score })
}

rows.sort((a, b) => b.score - a.score || b.count - a.count)
let bad = 0
for (const r of rows) {
  if (!r.faults.length) continue
  bad++
  console.log(`\n${r.model}  (placed ${r.count}×, severity ${r.score})`)
  for (const f of r.faults) console.log('   • ' + f)
}
console.log(`\n${bad} of ${rows.length} placed models have something wrong with them.`)
