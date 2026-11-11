/* Repaint the Kaaba as the thing it was in 570.
 *
 * The baked texture it shipped with is a single flat brown noise, so the model
 * renders as a featureless dark slab — from the square in Mecca it reads as a
 * wall someone forgot to finish, which is a poor thing for the building the
 * whole region is arranged around.
 *
 * What stood there before the rebuild was low, roofless and dry-laid: courses
 * of rough Meccan granite, blue-grey and unmortared, about a man and a half
 * high. That is what this paints — irregular blocks in horizontal courses, each
 * with its own value, the joints reading as shadow rather than as lines.
 *
 * Run: node scripts/assets/kaaba-stone.mjs   (writes the GLB in place)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const GLB = new URL('../../public/assets/chapter1/models/kaaba.glb', import.meta.url).pathname.slice(1)

/* deterministic value noise, so a re-run produces the same stones */
let seed = 20240817
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

const N = 1024
const COURSE = 38           // px — about half a metre of wall
const px = Buffer.alloc(N * N * 3)

/* Meccan granite: blue-grey, warm only where the sun has cooked it. */
const BASE = [86, 84, 88]
/* Fill first. The courses are laid with a little jitter so they do not read as
   brickwork, and jitter leaves seams between them — on a flat canvas those come
   out as black lines straight across the wall. */
for (let i = 0; i < px.length; i += 3) {
  const k = 0.5 + rnd() * 0.12
  px[i] = BASE[0] * k
  px[i + 1] = BASE[1] * k
  px[i + 2] = BASE[2] * k
}
const rows = Math.ceil(N / COURSE) + 1
for (let r = 0; r < rows; r++) {
  const y0 = r * COURSE
  /* every course is laid to its own thickness and offset, the way dry stone is */
  const jitter = (rnd() - 0.5) * 5
  let x = -rnd() * 90
  while (x < N) {
    const w = 55 + rnd() * 105
    const v = 0.78 + rnd() * 0.42          // this block's own value
    const warm = (rnd() - 0.5) * 0.1
    for (let y = Math.max(0, Math.round(y0 + jitter) - 1); y < Math.min(N, y0 + COURSE + jitter + 1); y++) {
      for (let sx = Math.max(0, Math.round(x)); sx < Math.min(N, x + w); sx++) {
        /* joints: a soft darkening at the block's edges, never a drawn line */
        const dx = Math.min(sx - x, x + w - sx)
        const dy = Math.min(y - (y0 + jitter), y0 + COURSE + jitter - y)
        const edge = Math.min(1, Math.min(dx, dy) / 3.5)
        const grain = 0.9 + rnd() * 0.2
        const k = v * grain * (0.42 + 0.58 * edge)
        const i = (y * N + sx) * 3
        px[i] = Math.min(255, BASE[0] * k * (1 + warm))
        px[i + 1] = Math.min(255, BASE[1] * k)
        px[i + 2] = Math.min(255, BASE[2] * k * (1 - warm))
      }
    }
    x += w
  }
}

/* Keep the original atlas's alpha — the islands are where the geometry is. */
const buf = readFileSync(GLB)
let off = 12, json = null, bin = null, jsonLen = 0, jsonOff = 0, binOff = 0
while (off < buf.length) {
  const len = buf.readUInt32LE(off)
  const type = buf.readUInt32LE(off + 4)
  if (type === 0x4e4f534a) { json = JSON.parse(buf.subarray(off + 8, off + 8 + len).toString('utf8')); jsonLen = len; jsonOff = off + 8 }
  else { bin = buf.subarray(off + 8, off + 8 + len); binOff = off + 8 }
  off += 8 + len
}
const im = json.images[0]
const bv = json.bufferViews[im.bufferView]
const original = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)
const alpha = await sharp(original).ensureAlpha().extractChannel(3).resize(N, N).raw().toBuffer()

const painted = await sharp(px, { raw: { width: N, height: N, channels: 3 } })
  .joinChannel(alpha, { raw: { width: N, height: N, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toBuffer()

/* Rebuild the GLB with the new image in place of the old one. */
const pad = (n, to) => (to - (n % to)) % to
const newBinLen = bin.length - bv.byteLength + painted.length
const before = bin.subarray(0, bv.byteOffset || 0)
const after = bin.subarray((bv.byteOffset || 0) + bv.byteLength)
bv.byteLength = painted.length
for (const v of json.bufferViews) if (v !== bv && (v.byteOffset || 0) > (bv.byteOffset || 0)) v.byteOffset += painted.length - original.length
json.buffers[0].byteLength = newBinLen
im.mimeType = 'image/png'

const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8')
const jsonPad = Buffer.alloc(pad(jsonBuf.length, 4), 0x20)
const binBuf = Buffer.concat([before, painted, after])
const binPad = Buffer.alloc(pad(binBuf.length, 4), 0)
const total = 12 + 8 + jsonBuf.length + jsonPad.length + 8 + binBuf.length + binPad.length
const out = Buffer.alloc(total)
out.write('glTF', 0, 'ascii'); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8)
let o = 12
out.writeUInt32LE(jsonBuf.length + jsonPad.length, o); out.writeUInt32LE(0x4e4f534a, o + 4); o += 8
jsonBuf.copy(out, o); o += jsonBuf.length; jsonPad.copy(out, o); o += jsonPad.length
out.writeUInt32LE(binBuf.length + binPad.length, o); out.writeUInt32LE(0x004e4942, o + 4); o += 8
binBuf.copy(out, o)
writeFileSync(GLB, out)
console.log(`kaaba repainted: ${rows} courses, texture ${(painted.length / 1024) | 0} KB`)
