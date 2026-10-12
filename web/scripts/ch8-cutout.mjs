/* Chapter 8 — cut a watercolour vignette out of its white plate, chapter 2/3's way:
   flood-fill from the BORDER through near-white only, so pale cloth enclosed by the
   subject is never punched; then free the large flat-white pockets the border cannot
   reach; soften the alpha so the watercolour edge fades instead of being cut; trim to
   the subject plus a margin.
   Run: node scripts/ch8-cutout.mjs <in.png> <out.webp> [width] */
import sharp from 'sharp'
const [IN, OUT, WIDTH = '900'] = process.argv.slice(2)
const NEAR_WHITE = 232, SEED = 250, SPREAD = 244, MIN_POCKET = 400
const { data, info } = await sharp(IN).resize({ width: +WIDTH }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h, channels: ch } = info
const bg = new Uint8Array(w * h), queue = new Int32Array(w * h)
const ok = (i, t) => { const p = i * ch; return data[p] >= t && data[p + 1] >= t && data[p + 2] >= t }
let head = 0, tail = 0
const push = (i) => { if (i < 0 || i >= w * h || bg[i] || !ok(i, NEAR_WHITE)) return; bg[i] = 1; queue[tail++] = i }
for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
while (head < tail) { const i = queue[head++], x = i % w; if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); push(i - w); push(i + w) }
let pockets = 0
for (let s = 0; s < w * h; s++) {
  if (bg[s] || !ok(s, SEED)) continue
  const mark = []; head = 0; tail = 0
  const p2 = (i) => { if (i < 0 || i >= w * h || bg[i] || !ok(i, SPREAD)) return; bg[i] = 2; mark.push(i); queue[tail++] = i }
  p2(s)
  while (head < tail) { const i = queue[head++], x = i % w; if (x > 0) p2(i - 1); if (x < w - 1) p2(i + 1); p2(i - w); p2(i + w) }
  if (mark.length < MIN_POCKET) for (const i of mark) bg[i] = 3; else pockets++
}
const alpha = Buffer.alloc(w * h)
for (let i = 0; i < w * h; i++) alpha[i] = bg[i] === 1 || bg[i] === 2 ? 0 : 255
/* sharp hands a blurred one-channel buffer back as THREE channels unless told otherwise —
   read as one, every row slid sideways and the cutout came out in stripes */
const { data: blurred, info: binfo } = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(2.2).extractChannel(0).raw().toBuffer({ resolveWithObject: true })
const soft = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) soft[i] = blurred[i * binfo.channels]
const rgba = Buffer.alloc(w * h * 4)
let x0 = w, y0 = h, x1 = 0, y1 = 0
for (let i = 0; i < w * h; i++) {
  rgba[i * 4] = data[i * ch]; rgba[i * 4 + 1] = data[i * ch + 1]; rgba[i * 4 + 2] = data[i * ch + 2]; rgba[i * 4 + 3] = soft[i]
  if (soft[i] > 120) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
}
const M = 12
const left = Math.max(0, x0 - M), top = Math.max(0, y0 - M)
const cw = Math.min(w, x1 + M) - left, chh = Math.min(h, y1 + M) - top
await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract({ left, top, width: cw, height: chh }).webp({ quality: 88, alphaQuality: 100 }).toFile(OUT)
console.log(`${OUT}: ${cw}×${chh}, inner pockets freed: ${pockets}`)
