/* A ninth sky, so the chapter can be one day.
 *
 * Nine regions, eight painted panoramas: two regions had to share an hour, and
 * whichever pair drew the short straw read as the same place twice. The journey
 * runs from first light in the Yemen highlands to the overlook at the end, so
 * the missing hour is the one after the sun has gone — the evening panorama
 * cooled and dropped, with the warm band left only where the sun set.
 *
 * Derived rather than painted, so it keeps the same horizon line and the same
 * mountains as the evening it follows. Idempotent: writes a new file.
 * Run: node scripts/assets/sky-dusk.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const TEX = new URL('../../public/assets/chapter1/tex/', import.meta.url)
const src = readFileSync(new URL('sky-evening.png', TEX).pathname.slice(1))
const { width, height } = await sharp(src).metadata()
const { data } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

for (let y = 0; y < height; y++) {
  /* 0 at the zenith, 1 at the horizon, then back down over the ground */
  const t = Math.min(1, y / (height * 0.5))
  const sky = 1 - t
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4
    /* dusk is the sky losing its red first and its blue last */
    const drop = 0.52 + 0.2 * t
    data[i] = Math.min(255, data[i] * drop * (1 - 0.18 * sky))
    data[i + 1] = Math.min(255, data[i + 1] * drop * (1 + 0.04 * sky))
    data[i + 2] = Math.min(255, data[i + 2] * drop * (1 + 0.34 * sky))
  }
}
const out = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
writeFileSync(new URL('sky-dusk.png', TEX).pathname.slice(1), out)
console.log(`sky-dusk.png written — ${width}×${height}, ${(out.length / 1024) | 0} KB`)
