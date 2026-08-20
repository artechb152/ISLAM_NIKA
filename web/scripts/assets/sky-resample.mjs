/* The nine skies, resampled for the screen they are actually shown on.
 *
 * Each panorama is 1536×768 equirectangular — 4.27 source pixels per degree.
 * The game renders at fov 55 with dpr up to 1.75, so roughly 86° of horizontal
 * view samples about 365 source pixels and stretches them across the viewport:
 * five to nine times magnification, on the part of the frame that fills
 * everything above the horizon. The GPU covers that gap with bilinear
 * filtering, which is the softest possible answer, and on a smooth desert
 * gradient it also bands — a 1536-wide dawn has visible steps in it.
 *
 * Resampling cannot invent detail that was never painted. What it can do is
 * take the interpolation away from the GPU and give it to Lanczos, put a
 * little contrast back into the painted mountains near the horizon, and break
 * banding with grain far below the threshold of notice.
 *
 * MEASURED FIRST, AND THE ANSWER WAS NO. `--check` reports the longest run of
 * identical values down a column, which is a direct read on banding: all nine
 * skies come back at 1–2 pixels, meaning they are already dithered and there
 * is no banding to fix. That removed the main reason to resample. What was
 * left — Lanczos in place of the GPU's bilinear filter, plus a light unsharp
 * pass — is a marginal gain that would have cost roughly 3 MB per region in
 * download, on the asset the arrival plate is already waiting for.
 *
 * So this has not been run on the shipped textures, and should not be without
 * a reason better than "bigger is sharper". It is kept for `--check`, and for
 * the day the panoramas are repainted at a resolution worth resampling from.
 *
 * Idempotent by way of _src: the first run moves the original aside, and every
 * run after that resamples from it rather than from its own output.
 *
 * Run: node scripts/assets/sky-resample.mjs [--width 4096] [--check]
 */
import { readdirSync, existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const TEX = new URL('../../public/assets/chapter1/tex/', import.meta.url).pathname.slice(1)
const SRC = join(TEX, '_src')
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k)
  return i > 0 ? Number(process.argv[i + 1]) : d
}
const WIDTH = arg('width', 4096)
const CHECK = process.argv.includes('--check')

/* --check measures and writes nothing. It used to create _src and copy all
   nine 1.5 MB panoramas into it before reaching the branch that decides not to
   resample — twelve megabytes of duplicates for a measurement. */
if (!CHECK && !existsSync(SRC)) mkdirSync(SRC, { recursive: true })

/** Longest run of identical values down a column — a direct read on banding. */
async function banding(file) {
  const { data, info } = await sharp(file)
    .extract({ left: 0, top: 0, width: 8, height: (await sharp(file).metadata()).height })
    .resize(1, null)
    .raw()
    .toBuffer({ resolveWithObject: true })
  let worst = 1, run = 1
  for (let y = 1; y < info.height; y++) {
    const same = data[y * 3] === data[(y - 1) * 3] && data[y * 3 + 1] === data[(y - 1) * 3 + 1]
    run = same ? run + 1 : 1
    if (run > worst) worst = run
  }
  return worst
}

const skies = readdirSync(TEX).filter((f) => /^sky-.*\.png$/.test(f))
const rows = []

for (const name of skies) {
  const live = join(TEX, name)
  const orig = join(SRC, name)

  if (CHECK) {
    const meta = await sharp(live).metadata()
    rows.push({ sky: name, from: `${meta.width}×${meta.height}`, band: await banding(live) })
    continue
  }

  if (!existsSync(orig)) copyFileSync(live, orig)
  const meta = await sharp(orig).metadata()
  const before = { w: meta.width, h: meta.height, kb: Math.round(statSync(orig).size / 1024) }
  const band0 = await banding(orig)

  const height = Math.round(WIDTH / 2)
  const out = await sharp(orig)
    .resize(WIDTH, height, { kernel: sharp.kernel.lanczos3 })
    /* A light unsharp pass, tuned to the painted ridges near the horizon
       rather than to the sky itself: radius wide enough not to bite into the
       gradient, amount small enough that no halo appears against the sun. */
    .sharpen({ sigma: 1.6, m1: 0.4, m2: 1.1 })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()

  /* Grain last, at ±1 level. Below anything the eye resolves as texture, and
     above what a gradient needs to stop stepping — dithering costs a
     hundredth of a stop of noise and buys back every band in the sky. */
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() * 2.4 - 1.2) | 0
    data[i] = Math.min(255, Math.max(0, data[i] + n))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n))
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(live)

  const band1 = await banding(live)
  rows.push({
    sky: name,
    from: `${before.w}×${before.h}`,
    to: `${WIDTH}×${height}`,
    kb: `${before.kb} → ${Math.round(statSync(live).size / 1024)}`,
    'band run': `${band0} → ${band1}`,
  })
}

console.table(rows)
