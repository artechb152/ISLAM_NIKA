/* Put an asset's image buffer views back where its images actually are.
 *
 * Rewriting an image inside a GLB means every buffer view after it moves, and
 * getting that bookkeeping wrong leaves the file structurally valid and totally
 * broken: the JSON still says "image 1 starts at byte 427429", and byte 427429
 * is now the middle of image 0. The loader reports "unsupported image format"
 * and the model renders untextured.
 *
 * The data itself is still in the file, so this does not need a backup. Every
 * embedded image here is a JPEG, and a JPEG announces itself: FF D8 FF at the
 * start and FF D9 at the end. Scan for those, and hand each image view the
 * range it is actually sitting on.
 *
 * Run: node scripts/assets/repair-image-views.mjs [model ...]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const DIR = 'public/assets/chapter1/models/'

function readGLB(path) {
  const buf = readFileSync(path)
  if (buf.subarray(0, 4).toString('ascii') !== 'glTF') return null
  let off = 12, json = null, bin = null
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    const d = buf.subarray(off + 8, off + 8 + len)
    if (type === 0x4e4f534a) json = JSON.parse(d.toString('utf8'))
    else bin = d
    off += 8 + len
  }
  return json && bin ? { json, bin } : null
}

function writeGLB(path, json, bin) {
  const pad = (n) => (4 - (n % 4)) % 4
  const j = Buffer.from(JSON.stringify(json), 'utf8')
  const jp = Buffer.alloc(pad(j.length), 0x20)
  const bp = Buffer.alloc(pad(bin.length), 0)
  const total = 12 + 8 + j.length + jp.length + 8 + bin.length + bp.length
  const out = Buffer.alloc(total)
  out.write('glTF', 0, 'ascii')
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  let o = 12
  out.writeUInt32LE(j.length + jp.length, o); out.writeUInt32LE(0x4e4f534a, o + 4); o += 8
  j.copy(out, o); o += j.length
  jp.copy(out, o); o += jp.length
  out.writeUInt32LE(bin.length + bp.length, o); out.writeUInt32LE(0x004e4942, o + 4); o += 8
  bin.copy(out, o); o += bin.length
  bp.copy(out, o)
  writeFileSync(path, out)
}

/** Every JPEG in the buffer, as [start, end) ranges, in the order they appear. */
function findJpegs(bin, from) {
  const out = []
  let i = from
  while (i < bin.length - 3) {
    if (bin[i] === 0xff && bin[i + 1] === 0xd8 && bin[i + 2] === 0xff) {
      let k = i + 2
      while (k < bin.length - 1) {
        if (bin[k] === 0xff && bin[k + 1] === 0xd9) { out.push([i, k + 2]); i = k + 2; break }
        k++
      }
      if (k >= bin.length - 1) break
    } else i++
  }
  return out
}

const names = process.argv.slice(2)
const files = names.length ? names.map((n) => n + '.glb') : readdirSync(DIR).filter((n) => n.endsWith('.glb'))

for (const file of files) {
  const g = readGLB(DIR + file)
  if (!g) { console.log(`${file.padEnd(22)} not a GLB`); continue }
  const { json, bin } = g
  const imgs = (json.images ?? []).filter((im) => im.bufferView != null)
  if (!imgs.length) continue
  const views = imgs.map((im) => json.bufferViews[im.bufferView])
  /* A view is sound if it points at the start of ANY image, not only a JPEG —
     plenty of these assets embed PNG or WebP, and treating those as damaged
     reported twenty healthy models as broken. */
  const startsAnImage = (s) =>
    (bin[s] === 0xff && bin[s + 1] === 0xd8 && bin[s + 2] === 0xff) ||
    (bin[s] === 0x89 && bin[s + 1] === 0x50 && bin[s + 2] === 0x4e) ||
    (bin[s] === 0x52 && bin[s + 1] === 0x49 && bin[s + 2] === 0x46)
  const healthy = views.every((v) => startsAnImage(v.byteOffset ?? 0))
  if (healthy) { console.log(`${file.padEnd(22)} image views are sound`); continue }
  const first = Math.min(...views.map((v) => v.byteOffset ?? 0))
  const found = findJpegs(bin, Math.max(0, first - 4096))
  if (found.length < imgs.length) {
    console.log(`${file.padEnd(22)} ✗ found only ${found.length} JPEGs for ${imgs.length} images — leaving alone`)
    continue
  }
  /* Images sit in the buffer in the order their views declare, so match the
     found runs to the views sorted by the offset they claim. */
  const order = views.map((v, i) => ({ v, i })).sort((a, b) => (a.v.byteOffset ?? 0) - (b.v.byteOffset ?? 0))
  order.forEach((o, k) => {
    const [s, e] = found[k]
    o.v.byteOffset = s
    o.v.byteLength = e - s
  })
  for (const im of imgs) im.mimeType = 'image/jpeg'
  writeGLB(DIR + file, json, bin)
  console.log(`${file.padEnd(22)} ✓ repaired ${imgs.length} image views (${found.map(([s, e]) => `${s}+${e - s}`).join(', ')})`)
}
