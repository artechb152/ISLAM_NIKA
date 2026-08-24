/* Tileable ground textures, generated: periodic value-noise fBm in a warm
   palette, fine grain, sparse soft pebbles. The lesson from the live tour:
   low contrast reads as ground, high contrast reads as camouflage — the
   painterly pass and the region tint do the rest. */
import sharp from 'sharp'

const N = 1024
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
const smooth = (t) => t * t * (3 - 2 * t)

function noiseLayer(size, period, rand) {
  const lat = Array.from({ length: period * period }, () => rand())
  const at = (x, y) => lat[((y % period) * period + (x % period))]
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * period
    const y0 = Math.floor(gy), fy = smooth(gy - y0)
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * period
      const x0 = Math.floor(gx), fx = smooth(gx - x0)
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1)
      out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
    }
  }
  return out
}

function fbm(size, octaves, seed) {
  const rand = rng(seed)
  const out = new Float32Array(size * size)
  let amp = 1, total = 0, period = 4
  for (let o = 0; o < octaves; o++) {
    const layer = noiseLayer(size, period, rand)
    for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp
    total += amp
    amp *= 0.55
    period *= 2
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

async function ground(file, { base, high, pebble, pebbles = 220, contrast = 1, seed = 7 }) {
  const lo = hex(base), hi = hex(high), pb = hex(pebble)
  const macro = fbm(N, 4, seed)
  const grain = fbm(N, 2, seed + 99)
  const buf = Buffer.alloc(N * N * 3)
  for (let i = 0; i < N * N; i++) {
    let t = 0.5 + (macro[i] - 0.5) * contrast
    t = Math.max(0, Math.min(1, t + (grain[i] - 0.5) * 0.22))
    buf[i * 3] = lo[0] + (hi[0] - lo[0]) * t
    buf[i * 3 + 1] = lo[1] + (hi[1] - lo[1]) * t
    buf[i * 3 + 2] = lo[2] + (hi[2] - lo[2]) * t
  }
  /* pebbles: soft dark blobs, wrapped at the edges so the tile stays a tile */
  const rand = rng(seed + 1234)
  for (let p = 0; p < pebbles; p++) {
    const cx = rand() * N, cy = rand() * N
    const r = 2 + rand() * 5, k = 0.25 + rand() * 0.3
    for (let dy = -r - 1; dy <= r + 1; dy++) {
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        const d = Math.hypot(dx, dy)
        if (d > r + 1) continue
        const w = Math.max(0, 1 - d / (r + 1)) * k
        const x = ((Math.round(cx + dx) % N) + N) % N
        const y = ((Math.round(cy + dy) % N) + N) % N
        const i = (y * N + x) * 3
        buf[i] += (pb[0] - buf[i]) * w
        buf[i + 1] += (pb[1] - buf[i + 1]) * w
        buf[i + 2] += (pb[2] - buf[i + 2]) * w
      }
    }
  }
  await sharp(buf, { raw: { width: N, height: N, channels: 3 } })
    .jpeg({ quality: 86 })
    .toFile(`public/assets/chapter1/tex/${file}`)
  console.log(file, 'written')
}

/* mecca — evening plain: packed warm earth, faint dune banding */
await ground('ground-sandplain.jpg', {
  base: '#b89e7c', high: '#d3bb98', pebble: '#96ante'.length ? '#96805f' : '#96805f',
  pebbles: 170, contrast: 0.85, seed: 11,
})
/* narrow-pass — pale canyon floor: soft scree without the camouflage */
await ground('ground-softscree.jpg', {
  base: '#b3a68e', high: '#cfc2a9', pebble: '#8f english'.length ? '#8f8067' : '#8f8067',
  pebbles: 320, contrast: 0.9, seed: 23,
})
