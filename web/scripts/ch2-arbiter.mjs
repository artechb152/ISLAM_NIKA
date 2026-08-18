/* Cut the arbiter out of his watercolour paper — nothing else.

   Earlier versions of this script tried to DISSOLVE the plate into the page:
   multiply it by the page cream, then feather the rectangle away. Both failed
   for the same underlying reason (the paper is lighter than the parchment, so
   the plate stayed a visible bright rectangle) and the fix is not a better
   blend, it is removing the paper altogether.

   The paper is not flat white like the danger figures' plate — it is a textured
   watercolour sheet around #f2efe8 with visible grain. So the background test is
   two-part: bright AND close to neutral. The robes are also bright, but they are
   painted, so they carry shading and a warm cast that the paper does not.

   The alpha is then blurred a little, which suits a watercolour: the paint fades
   into the sheet at its edges, and a hard cut there would look like a sticker.

   Run: node scripts/ch2-arbiter.mjs
*/
import sharp from 'sharp'
import { stat } from 'node:fs/promises'

const DIR = 'C:/Users/nikag/Downloads/ISLAM_NIKA/web/public/assets/chapter2/'
const SRC = DIR + 'arbiter.jpg' // the ORIGINAL plate, untouched
const OUT = DIR + 'arbiter.webp'

/** bright enough to be paper */
const LUMA = 218
/** and neutral enough — the painted robes carry a warm cast the sheet does not */
const CHROMA = 30

const sized = await sharp(SRC).resize({ width: 860, withoutEnlargement: true }).removeAlpha().raw()
  .toBuffer({ resolveWithObject: true })
const { data, info } = sized
const { width: w, height: h, channels: ch } = info

const isPaper = (i) => {
  const p = i * ch
  const r = data[p]
  const g = data[p + 1]
  const b = data[p + 2]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max >= LUMA && max - min <= CHROMA
}

/* flood-fill from the border: only paper CONNECTED to the edge is background,
   so a pale highlight enclosed by the figure stays part of him */
const bg = new Uint8Array(w * h)
const queue = new Int32Array(w * h)
let head = 0
let tail = 0
const push = (i) => {
  if (i < 0 || i >= w * h || bg[i] || !isPaper(i)) return
  bg[i] = 1
  queue[tail++] = i
}
for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
while (head < tail) {
  const i = queue[head++]
  const x = i % w
  if (x > 0) push(i - 1)
  if (x < w - 1) push(i + 1)
  push(i - w)
  push(i + w)
}

/* the alpha plane, softened — a watercolour edge is not a die-cut */
const alphaRaw = Buffer.alloc(w * h)
for (let i = 0; i < w * h; i++) alphaRaw[i] = bg[i] ? 0 : 255
const { data: blurred, info: aInfo } = await sharp(alphaRaw, { raw: { width: w, height: h, channels: 1 } })
  .blur(1.4)
  .raw()
  .toBuffer({ resolveWithObject: true })
const aCh = aInfo.channels

const mask = Buffer.alloc(w * h)
for (let i = 0; i < w * h; i++) mask[i] = blurred[i * aCh]

/* joinChannel, not composite: `blend:'dest-in'` reads the mask's ALPHA, so an
   opaque greyscale mask masks nothing at all. */
await sharp(data, { raw: { width: w, height: h, channels: ch } })
  .joinChannel(mask, { raw: { width: w, height: h, channels: 1 } })
  .trim({ threshold: 1 })
  .webp({ quality: 88, alphaQuality: 94, effort: 6 })
  .toFile(OUT)

const kept = 1 - bg.reduce((a, c) => a + c, 0) / (w * h)
const m = await sharp(OUT).metadata()
console.log(
  `arbiter.webp  ${m.width}×${m.height}  ${Math.round((await stat(OUT)).size / 1024)}KB · ` +
    `alpha ${m.hasAlpha} · ${(kept * 100).toFixed(1)}% of the plate kept`,
)
