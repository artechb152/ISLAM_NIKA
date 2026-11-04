/* Cut a watercolour vignette off its white ground (rule 44, chapter 3's method): flood fill
   from the border over white only (tolerance 14), so nothing INSIDE the subject is holed; then
   a 5px alpha ramp so the wash fades instead of ending on a cut; crop to the subject + 12px. */
import sharp from 'sharp'
const [src, out] = process.argv.slice(2)
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const TOL = 14, RAMP = 5
const bg = new Uint8Array(W * H)
const white = (i) => data[i * 4] >= 255 - TOL && data[i * 4 + 1] >= 255 - TOL && data[i * 4 + 2] >= 255 - TOL
const q = []
for (let x = 0; x < W; x++) q.push(x, (H - 1) * W + x)
for (let y = 0; y < H; y++) q.push(y * W, y * W + W - 1)
while (q.length) {
  const i = q.pop()
  if (bg[i] || !white(i)) continue
  bg[i] = 1
  const x = i % W, y = (i / W) | 0
  if (x) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (y) q.push(i - W); if (y < H - 1) q.push(i + W)
}
/* distance (chebyshev, capped) from the background, for the ramp */
const d = new Uint8Array(W * H).fill(RAMP)
for (let i = 0; i < W * H; i++) if (bg[i]) d[i] = 0
for (let pass = 0; pass < RAMP; pass++)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (d[i] === 0) continue
    let m = d[i]
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const xx = x + dx, yy = y + dy
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) m = Math.min(m, d[yy * W + xx] + 1)
    }
    d[i] = m
  }
let x0 = W, y0 = H, x1 = 0, y1 = 0
for (let i = 0; i < W * H; i++) {
  data[i * 4 + 3] = Math.round(255 * d[i] / RAMP)
  if (d[i]) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
}
const P = 12
const left = Math.max(0, x0 - P), top = Math.max(0, y0 - P)
await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left, top, width: Math.min(W, x1 + P + 1) - left, height: Math.min(H, y1 + P + 1) - top })
  .resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toFile(out)
console.log(out, 'bg', (bg.reduce((a, b) => a + b, 0) / (W * H) * 100).toFixed(1) + '%')
