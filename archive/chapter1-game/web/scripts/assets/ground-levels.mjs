/* Set each ground texture to the albedo and the hue the material actually has.
 *
 * These were generated at whatever value and colour the generator happened to
 * produce, and two were badly out. The scree averaged 69/255 — darker than wet
 * coal, so the pass and Mecca were played on near-black ground. And the terrace
 * soil averaged olive: under a first-light sky the Yemen highlands read as a
 * swamp rather than a terraced hillside, and correcting only its mean did not
 * help, because the green lived in patches that sat right under the player's
 * feet at the tiling this ground is used at.
 *
 * The tint in each layout cannot fix either: it is a multiply, so it can only
 * take a texture down, and it cannot move one channel against another. Both
 * corrections belong in the texture.
 *
 * Idempotent — it measures what a file currently is and corrects it to target,
 * so running it twice changes nothing the second time.
 * Run: node scripts/assets/ground-levels.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const TEX = new URL('../../public/assets/chapter1/tex/', import.meta.url)

/* Real sunlit albedo, as sRGB means. Basalt scree is genuinely dark; terraced
   highland soil is a warm brown, not a green. */
const TARGET = {
  'sand.jpg': [222, 194, 152],
  'ground-gravel.jpg': [142, 134, 121],
  'ground-scree.jpg': [98, 95, 93],
  'ground-soil.jpg': [134, 117, 93],
  'ground-terrace.jpg': [150, 130, 101],
}
/** Grounds whose own texture leans green and should not. */
const DEGREEN = new Set(['ground-terrace.jpg', 'ground-soil.jpg'])
/** How far above the red/blue average a pixel's green is allowed to sit.
    Clamped outright rather than eased toward, and with a couple of levels of
    slack: easing left every corrected pixel sitting just above the line, so the
    next run found it again and re-encoded the JPEG for nothing. */
const GREEN_HEADROOM = 1.06
const GREEN_SLACK = 3

for (const [file, target] of Object.entries(TARGET)) {
  const path = new URL(file, TEX).pathname.slice(1)
  /* Read into memory first: sharp keeps a handle on a path it opened, and on
     Windows that handle blocks the write back to the same file. */
  const src = readFileSync(path)
  const { data: px, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  let greened = 0
  if (DEGREEN.has(file))
    for (let i = 0; i < px.length; i += 4) {
      const cap = ((px[i] + px[i + 2]) / 2) * GREEN_HEADROOM
      if (px[i + 1] <= cap + GREEN_SLACK) continue
      px[i + 1] = cap
      greened++
    }

  const before = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .removeAlpha().resize(1, 1, { fit: 'fill' }).raw().toBuffer()
  const mean = [before[0], before[1], before[2]]
  const gain = target.map((t, i) => t / Math.max(1, mean[i]))
  if (!greened && gain.every((g) => Math.abs(g - 1) < 0.015)) {
    console.log(`${file.padEnd(22)} already at ${mean.join(',')}`)
    continue
  }
  const out = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .removeAlpha()
    .linear(gain, [0, 0, 0])
    .jpeg({ quality: 92 })
    .toBuffer()
  writeFileSync(path, out)
  const after = await sharp(out).resize(1, 1, { fit: 'fill' }).raw().toBuffer()
  console.log(
    `${file.padEnd(22)} ${mean.join(',')} → ${[...after.slice(0, 3)].join(',')}` +
      (greened ? `  (${((greened / (info.width * info.height)) * 100) | 0}% of pixels pulled off green)` : ''),
  )
}
