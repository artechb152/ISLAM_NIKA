/* Tiling surfaces for the props this chapter has to rebuild.
 *
 * The models that came out worst were the ones asked to carry a photoscan of
 * something they are not: a "dry stone wall" that scanned as a heap of chips, a
 * "sack pile" that decimated into black cloth with white speckles. Rebuilt props
 * need surfaces of their own, and these are them — seamless, deterministic, and
 * in the palette the nine regions already live in.
 *
 * Run: node scripts/assets/make-textures.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import sharp from 'sharp'

const OUT = new URL('./tex/', import.meta.url).pathname.slice(1)
mkdirSync(OUT, { recursive: true })
const N = 512

let seed = 8172361
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

/** Value noise that wraps, so the texture tiles. */
function noise(cells, octaves = 3) {
  const grid = []
  for (let o = 0; o < octaves; o++) {
    const c = cells << o
    const g = new Float32Array(c * c)
    for (let i = 0; i < g.length; i++) g[i] = rnd()
    grid.push({ c, g })
  }
  const at = (x, y) => {
    let v = 0
    let amp = 1
    let total = 0
    for (const { c, g } of grid) {
      const fx = x * c, fy = y * c
      const x0 = Math.floor(fx) % c, y0 = Math.floor(fy) % c
      const x1 = (x0 + 1) % c, y1 = (y0 + 1) % c
      const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy)
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty)
      const a = g[y0 * c + x0], b = g[y0 * c + x1], d = g[y1 * c + x0], e = g[y1 * c + x1]
      v += (a * (1 - sx) + b * sx) * (1 - sy) * amp + (d * (1 - sx) + e * sx) * sy * amp
      total += amp
      amp *= 0.5
    }
    return v / total
  }
  return at
}

async function write(name, fill) {
  const px = Buffer.alloc(N * N * 3)
  fill(px)
  const buf = await sharp(px, { raw: { width: N, height: N, channels: 3 } }).jpeg({ quality: 90 }).toBuffer()
  writeFileSync(OUT + name, buf)
  console.log(`  ${name}  ${(buf.length / 1024) | 0} KB`)
}

const put = (px, i, r, g, b) => { px[i] = Math.max(0, Math.min(255, r)); px[i + 1] = Math.max(0, Math.min(255, g)); px[i + 2] = Math.max(0, Math.min(255, b)) }

/* --- limestone rubble, laid in courses: what a field wall is actually made of */
await write('stone.jpg', (px) => {
  const grain = noise(24, 3)
  const blot = noise(6, 2)
  const COURSE = 64
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const row = Math.floor(y / COURSE)
      const off = (row % 2) * 37 + row * 19
      const cell = Math.floor((x + off) / 78)
      const key = Math.sin(cell * 12.9898 + row * 78.233) * 43758.5453
      const v = 0.82 + (key - Math.floor(key)) * 0.34
      const dx = ((x + off) % 78) / 78, dy = (y % COURSE) / COURSE
      const edge = Math.min(1, Math.min(Math.min(dx, 1 - dx), Math.min(dy, 1 - dy)) * 11)
      const k = v * (0.55 + 0.45 * edge) * (0.86 + grain(x / N, y / N) * 0.28) * (0.92 + blot(x / N, y / N) * 0.16)
      const i = (y * N + x) * 3
      put(px, i, 196 * k, 181 * k, 156 * k)
    }
})

/* --- mud brick under a coat of plaster, the way every wall from Yemen to Mecca is built */
await write('mudbrick.jpg', (px) => {
  const grain = noise(40, 3)
  const wash = noise(5, 2)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const row = Math.floor(y / 34)
      const cell = Math.floor((x + (row % 2) * 46) / 92)
      const key = Math.sin(cell * 31.7 + row * 11.3) * 24634.6345
      const v = 0.94 + (key - Math.floor(key)) * 0.12
      const dy = (y % 34) / 34
      const joint = Math.min(1, Math.min(dy, 1 - dy) * 9)
      const k = v * (0.9 + 0.1 * joint) * (0.9 + grain(x / N, y / N) * 0.2) * (0.88 + wash(x / N, y / N) * 0.24)
      const i = (y * N + x) * 3
      put(px, i, 214 * k, 182 * k, 137 * k)
    }
})

/* --- split timber: crates, beams, the frame of an awning */
await write('wood.jpg', (px) => {
  const grain = noise(64, 2)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const plank = Math.floor(y / 52)
      const key = Math.sin(plank * 17.1) * 9134.77
      const v = 0.85 + (key - Math.floor(key)) * 0.3
      const dy = (y % 52) / 52
      const gap = Math.min(1, Math.min(dy, 1 - dy) * 12)
      const fibre = 0.88 + Math.sin(x * 0.22 + grain(x / N, y / N) * 9) * 0.12
      const k = v * fibre * (0.5 + 0.5 * gap)
      const i = (y * N + x) * 3
      put(px, i, 146 * k, 108 * k, 68 * k)
    }
})

/* --- coarse woven sacking, undyed */
await write('sack.jpg', (px) => {
  const dirt = noise(9, 2)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      /* A weave reads as cloth only when the two threads are visibly different
         weights and the whole thing is unevenly dirty — an even checker at this
         scale just goes to flat beige. */
      const warp = Math.sin(x * 0.78) * 0.5 + 0.5
      const weft = Math.sin(y * 0.61) * 0.5 + 0.5
      const k = (0.72 + warp * 0.2 + weft * 0.26) * (0.72 + dirt(x / N, y / N) * 0.56)
      const i = (y * N + x) * 3
      put(px, i, 186 * k, 160 * k, 116 * k)
    }
})

/* --- goat-hair cloth: the black tents, and the awnings over a market */
await write('goathair.jpg', (px) => {
  const wear = noise(7, 2)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const band = Math.sin(y * 0.06) > 0.55 ? 1.5 : 1
      const weave = 0.92 + Math.sin(x * 2.1) * 0.06 + Math.sin(y * 3.3) * 0.04
      const k = band * weave * (0.8 + wear(x / N, y / N) * 0.4)
      const i = (y * N + x) * 3
      put(px, i, 74 * k, 62 * k, 54 * k)
    }
})

/* --- dry straw and fodder */
await write('straw.jpg', (px) => {
  const blot = noise(8, 2)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      /* individual stalks lying every which way, and deep shade between them */
      let k = 0.42
      for (let s = 0; s < 5; s++) {
        const ang = s * 1.13
        const u = x * Math.cos(ang) + y * Math.sin(ang)
        const strand = Math.sin(u * (0.9 + s * 0.31) + blot(x / N, y / N) * 12)
        if (strand > 0.72) k = Math.max(k, 0.72 + strand * 0.5 + s * 0.03)
      }
      k *= 0.82 + blot(y / N, x / N) * 0.36
      const i = (y * N + x) * 3
      put(px, i, 198 * k, 168 * k, 104 * k)
    }
})
/* --- rough undressed stone, for props whose stones are modelled one by one */
await write('rubble.jpg', (px) => {
  const grain = noise(48, 3)
  const blot = noise(7, 3)
  const pit = noise(90, 2)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const p = pit(x / N, y / N)
      const k = (0.74 + grain(x / N, y / N) * 0.34) * (0.84 + blot(x / N, y / N) * 0.3) * (p < 0.32 ? 0.78 : 1)
      const i = (y * N + x) * 3
      put(px, i, 178 * k, 165 * k, 143 * k)
    }
})

console.log('textures written to scripts/assets/tex/')
