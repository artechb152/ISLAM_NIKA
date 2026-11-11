/* Take the blue out of the scanned rocks.
 *
 * basalt1 and basalt2 are placed fifty-eight times between them and both scanned
 * under a cold sky: their textures are frankly blue-grey, which in a desert at
 * gold hour reads as somebody else's asset pack dropped into the scene. It is
 * also most of the answer to "why is everything grey".
 *
 * This rotates each texture off the blue axis and onto the warm-neutral one,
 * keeping every bit of the scan's own light and shadow. Idempotent: it measures
 * the cast first and does nothing to a texture that no longer has one.
 * Run: node scripts/assets/warm-rocks.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const DIR = 'public/assets/chapter1/models/'
/** model → how far to carry it toward the warm axis, 0..1 */
const COLD = { basalt1: 0.85, basalt2: 0.85, butte: 0.4, boulder1: 0.3, boulder2: 0.3, boulder3: 0.3, boulder4: 0.3 }
/** the hue a sun-baked desert rock actually sits on */
const WARM = [1.06, 1.0, 0.86]

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

function writeGLB(path, json, bin) {
  const pad = (n) => (4 - (n % 4)) % 4
  const j = Buffer.from(JSON.stringify(json), 'utf8')
  const jp = Buffer.alloc(pad(j.length), 0x20)
  const bp = Buffer.alloc(pad(bin.length), 0)
  const total = 12 + 8 + j.length + jp.length + 8 + bin.length + bp.length
  const out = Buffer.alloc(total)
  out.write('glTF', 0, 'ascii'); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8)
  let o = 12
  out.writeUInt32LE(j.length + jp.length, o); out.writeUInt32LE(0x4e4f534a, o + 4); o += 8
  j.copy(out, o); o += j.length; jp.copy(out, o); o += jp.length
  out.writeUInt32LE(bin.length + bp.length, o); out.writeUInt32LE(0x004e4942, o + 4); o += 8
  bin.copy(out, o); o += bin.length; bp.copy(out, o)
  writeFileSync(path, out)
}

for (const [model, strength] of Object.entries(COLD)) {
  const path = DIR + model + '.glb'
  let json, bin
  try { ({ json, bin } = readGLB(path)) } catch { console.log(`${model.padEnd(10)} no file`); continue }
  /* ONLY the base colour. Walking every image in the file also warms the
     normal map — whose whole content is a flat 127,127,246 encoding of "this
     surface faces outward" — and tinting that bends every normal in the mesh.
     Which is exactly what happened the first time this ran. */
  const colourImages = new Set()
  for (const mat of json.materials ?? []) {
    const t = mat.pbrMetallicRoughness?.baseColorTexture
    if (t == null) continue
    const src = json.textures?.[t.index]?.source
    if (src != null) colourImages.add(src)
  }
  let changed = false
  const pieces = []
  let cursor = 0
  for (let i = 0; i < (json.images ?? []).length; i++) {
    const im = json.images[i]
    if (im.bufferView == null || !colourImages.has(i)) continue
    const bv = json.bufferViews[im.bufferView]
    const start = bv.byteOffset ?? 0
    const src = bin.subarray(start, start + bv.byteLength)
    const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    /* how blue is it, on average? */
    let r = 0, g = 0, b = 0
    for (let k = 0; k < data.length; k += 3) { r += data[k]; g += data[k + 1]; b += data[k + 2] }
    const n = data.length / 3
    r /= n; g /= n; b /= n
    const lum = (r + g + b) / 3 || 1
    /* the correction that would put this texture's own mean on the warm axis */
    const gain = [WARM[0] / (r / lum), WARM[1] / (g / lum), WARM[2] / (b / lum)]
    const soft = gain.map((v) => 1 + (v - 1) * strength)
    if (soft.every((v) => Math.abs(v - 1) < 0.02)) continue
    for (let k = 0; k < data.length; k += 3)
      for (let c = 0; c < 3; c++) data[k + c] = Math.max(0, Math.min(255, data[k + c] * soft[c]))
    const encoded = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
      .jpeg({ quality: 90 }).toBuffer()
    pieces.push({ before: bin.subarray(cursor, start), encoded, bv, oldLen: bv.byteLength })
    cursor = start + bv.byteLength
    im.mimeType = 'image/jpeg'
    changed = true
    console.log(`${model.padEnd(10)} image ${i}: ${[r, g, b].map((v) => v | 0).join(',')} → ×${soft.map((v) => v.toFixed(2)).join(',')}`)
  }
  if (!changed) { console.log(`${model.padEnd(10)} already warm`); continue }
  /* rebuild the binary chunk with the new images in place */
  const parts = []
  let shift = 0
  for (const p of pieces) {
    parts.push(p.before, p.encoded)
    p.bv.byteOffset = (p.bv.byteOffset ?? 0) + shift
    const delta = p.encoded.length - p.oldLen
    for (const v of json.bufferViews) if (v !== p.bv && (v.byteOffset ?? 0) > (p.bv.byteOffset ?? 0)) v.byteOffset += delta
    p.bv.byteLength = p.encoded.length
    shift += delta
  }
  parts.push(bin.subarray(cursor))
  const nb = Buffer.concat(parts)
  json.buffers[0].byteLength = nb.length
  writeGLB(path, json, nb)
}
