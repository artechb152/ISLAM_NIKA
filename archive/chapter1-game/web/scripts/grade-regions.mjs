/* Make each region's light agree with its own sky.
 *
 * Every region paints a 360° panorama behind it and then lights and tints the
 * ground by hand. Where the two disagree the seam is brutal: the Yemen heights
 * stood on olive-green terrace soil under a panorama whose own ground is warm
 * brown, so the played terrain ended exactly where the painted world began and
 * the whole region read as two photographs stapled together.
 *
 * Nothing here is a taste call. The panorama already contains the answer — its
 * zenith, its horizon and its ground are the region's sky colour, fog colour
 * and ground colour — so this reads them off the image and writes them into the
 * layout. Run: node scripts/grade-regions.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import sharp from 'sharp'

const LIB = new URL('../src/lib/chapter1/', import.meta.url)
const TEX = new URL('../public/assets/chapter1/tex/', import.meta.url)
const WRITE = process.argv.includes('--write')

/** Mean colour of a horizontal band of the panorama, as 0–255 rgb. */
async function band(file, from, to) {
  const img = sharp(new URL(file, TEX).pathname.slice(1))
  const { width, height } = await img.metadata()
  const top = Math.round(height * from)
  const h = Math.max(1, Math.round(height * (to - from)))
  const { data } = await img
    .extract({ left: 0, top, width, height: h })
    .resize(1, 1, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return [data[0], data[1], data[2]]
}

/** Mean colour of a whole texture — what the tint is going to be multiplied into. */
const meanCache = new Map()
async function meanOf(file) {
  if (!meanCache.has(file)) {
    const { data } = await sharp(new URL(file, TEX).pathname.slice(1))
      .resize(1, 1, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    meanCache.set(file, [data[0], data[1], data[2]])
  }
  return meanCache.get(file)
}

const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t)
/* A light's colour is a hue, not a level. Reading the panorama's evening ground
   straight into a hemisphere light gave a #7c4e36 bounce — a dark brown light,
   which no amount of intensity can make bright, and which is why Mecca stayed
   mud however far the exposure was pushed. Normalising each light onto its
   brightest channel puts the level back where it belongs: in the intensity. */
const asLight = (c) => { const m = Math.max(...c, 1); return c.map((v) => (v / m) * 250) }
const scale = (c, k) => c.map((v) => v * k)

/** Where the sun stands in a panorama, and how hard it burns.
 *
 * The layouts each carried a hand-placed sun, which was right for whichever sky
 * was hanging behind them at the time — and the moment the hours were put in
 * order, five regions were lit from one side and showed a sun on the other.
 * The panorama knows: its brightest pixel in the upper half IS the sun, and
 * three.js's equirectangular mapping turns that pixel straight back into a
 * direction (u = atan2(z, x), v = asin(y)). */
async function sunOf(file) {
  const src = readFileSync(new URL(file, TEX).pathname.slice(1))
  const W = 256, H = 128
  const { data } = await sharp(src).resize(W, H, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  let best = -1, bx = 0, by = 0
  for (let py = 0; py < H * 0.5; py++)
    for (let pxi = 0; pxi < W; pxi++) {
      const i = (py * W + pxi) * 3
      /* The sun is the brightest WARM thing up there. Ranking on brightness
         alone picks a cloud — which at dusk put the sun on the wrong side of
         the sky and turned its light green. */
      if (data[i] < data[i + 2]) continue
      const l = data[i] * 0.5 + data[i + 1] * 0.35 + data[i + 2] * 0.15
      if (l > best) { best = l; bx = pxi; by = py }
    }
  const u = (bx + 0.5) / W
  const v = 1 - (by + 0.5) / H
  const lat = (v - 0.5) * Math.PI
  const theta = (u - 0.5) * 2 * Math.PI
  const y = Math.sin(lat)
  const r = Math.cos(lat)
  /* Lifted off the horizon: a sun exactly at the skyline throws shadows the
     length of the region and lights nothing. */
  const dir = [r * Math.cos(theta), Math.max(0.5, y), r * Math.sin(theta)]
  const i = (by * W + bx) * 3
  return { dir, colour: [data[i], data[i + 1], data[i + 2]], strength: best / 255 }
}

for (const f of readdirSync(new URL('.', LIB)).filter((n) => n.endsWith('-layout.json'))) {
  const path = new URL(f, LIB).pathname.slice(1)
  const j = JSON.parse(readFileSync(path, 'utf8'))
  const sky = j.mood?.sky ?? 'sky-dawn.png'
  const zenith = await band(sky, 0.02, 0.16)
  const horizon = await band(sky, 0.44, 0.52)
  const ground = await band(sky, 0.62, 0.95)

  j.mood = j.mood ?? {}
  j.mood.sky = sky
  /* The hemisphere fill IS the panorama, split in two: light from the sky
     above, bounce from the ground below. */
  j.mood.fill = {
    sky: hex(asLight(mix(zenith, [255, 255, 255], 0.35))),
    /* The panorama's ground read straight off is nearly black at first light,
       and a black bounce light is no light at all — the underside of every
       tent and every face went to mud. Lift it to a plausible bounce while
       keeping which way it leans. */
    ground: hex(asLight(mix(scale(ground, 2.1), [138, 118, 96], 0.3))),
    intensity: j.mood.fill?.intensity ?? 1.2,
  }
  /* Distance haze has to be the colour the painted horizon already is, or the
     played ground stops dead at the panorama's feet. */
  j.mood.fog = {
    color: hex(mix(horizon, [255, 255, 255], 0.12)),
    near: j.mood.fog?.near ?? 60,
    far: j.mood.fog?.far ?? 460,
  }
  /* The sun: direction, colour and strength all read off the same panorama, so
     the shadows on the ground point away from the sun you can actually see.
     sky-dusk is the exception — it is sky-evening after the sun has gone, and
     its own brightest warm pixel is the afterglow opposite the sunset, which
     would light the region from entirely the wrong side. */
  const SUN_FROM = { 'sky-dusk.png': 'sky-evening.png' }
  const sun = await sunOf(SUN_FROM[sky] ?? sky)
  const len = Math.hypot(...sun.dir) || 1
  /* How hard the painted sky itself lights the scene, and how the whole frame
     is exposed — both follow the panorama's own level, so a first-light region
     is dim and a midday one is not. */
  const level = (zenith[0] + zenith[1] + zenith[2] + horizon[0] + horizon[1] + horizon[2]) / 6 / 255
  /* A low sun takes the colour of the air it comes through, which is the
     horizon band itself — that is why first light is rose and noon is white.
     And sunlight is never green: whatever the brightest warm pixel turns out to
     be, pull it onto the warm-neutral axis before it becomes a light. */
  const warm = mix(mix(sun.colour, horizon, 0.35), [255, 255, 255], 0.4)
  warm[1] = Math.min(warm[1], (warm[0] + warm[2]) / 2 + 6)
  j.mood.sun = {
    position: sun.dir.map((c) => +((c / len) * 30).toFixed(1)),
    color: hex(asLight(warm)),
    /* The hour's own level, not the brightness of one pixel: a bright cloud at
       dusk is not three and a half suns. Held below the point where cloth
       clips, too — the travellers' robes used to go past white with no folds
       left in them. */
    intensity: +(1.3 + level * 2.1).toFixed(2),
  }
  /* Two things make a region hard to read, and they compound: a low hour and a
     dark material. Mecca has both — an evening sky over a valley of basalt
     scree — and graded on the hour alone it came out as mud with a building
     somewhere in it. So the darker the ground the region stands on, the more
     the sky and the exposure open up, which is what your eye does walking into
     a shaded street and what a camera does after it. */
  const groundMean = j.terrain?.ground ? (await meanOf(j.terrain.ground)).reduce((x, y) => x + y, 0) / 3 : 150
  const dark = Math.max(0, (140 - groundMean) / 140)
  j.mood.skyLight = +(0.4 + level * 0.55 + dark * 0.45).toFixed(2)
  j.mood.exposure = +(1.55 - level * 0.5 + dark * 0.35).toFixed(2)
  j.mood.fill.intensity = +(0.95 + level * 0.4 + dark * 0.6).toFixed(2)

  /* And the terrain. The tint MULTIPLIES the ground texture, so writing the
     panorama's ground colour straight in is wrong twice over: it fights the
     texture's own brightness and it turns every region orange (which is what
     happened the first time). What we actually want from the panorama is its
     HUE — how far its ground leans warm or cool of neutral — applied at a
     luminance the texture keeps for itself. So: take the ratio of each channel
     to the panorama ground's own mean, soften it toward neutral, and hold the
     overall level. The ground then belongs to the same hour as the sky behind
     it without stopping being sand, gravel or terrace soil. */
  if (j.terrain) {
    const lum = (ground[0] + ground[1] + ground[2]) / 3 || 1
    const chroma = ground.map((v) => 1 + (v / lum - 1) * 0.28)
    /* Written at a fixed brightness: this multiplies a texture that was already
       authored at the value it should render, so the tint's only job is the
       lean. Anything darker and the ground goes to mud, which is exactly what
       made the tint get switched off in the first place. */
    /* Normalised on its brightest channel rather than its mean. Scaled by the
       mean, every warm region's red clamped at 255 and nine different hours all
       came out the same orange; anchoring the top channel keeps the lean intact
       and guarantees nothing clips. */
    const top = Math.max(...chroma)
    j.terrain.tint = hex(chroma.map((c) => (c / top) * 246))
  }

  console.log(
    `${f.replace('-layout.json', '').padEnd(14)} ${sky.padEnd(20)} sun ${j.mood.sun.position.join(',').padEnd(20)} ${j.mood.sun.color} ×${j.mood.sun.intensity}  skyLight ${j.mood.skyLight}  exp ${j.mood.exposure}  ground ${j.terrain?.tint ?? '—'}`,
  )
  if (WRITE) writeFileSync(path, JSON.stringify(j, null, 2) + '\n')
}
console.log(WRITE ? '\nwritten' : '\n(dry run — pass --write to apply)')
