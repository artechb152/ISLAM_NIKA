/* Chapter 14's derived assets, from concept/chapter14/gen/*.png:
     t-<name>.jpg  — a motif card's painting: the opaque middle of the watercolour vignette
                     (its white wash edges cut away), so it can fill a frame with object-fit:cover
     s-<name>.jpg  — a full-screen frame of 02's motif scene: the middle 82% × 66%, 1600px wide
     syria-wide.jpg — the band that opens 02 (painted edge to edge, no vignette)
   The cut-outs on transparency (minbar-cut, lectern-cut, osint-media) are made by
   chapter14-cut.mjs. Run from web/: node scripts/chapter14-assets.mjs [names…] */
import sharp from 'sharp'
import { existsSync } from 'node:fs'
const GEN = '../concept/chapter14/gen/'
const OUT = 'public/assets/chapter14/'
const THUMBS = { 'm-badr': 'm-badr', 'm-fajr': 'm-fajr', 'm-umayyad': 'm-umayyad', minbar: 'minbar-cut', 'm-kiswa': 'm-kiswa',
  'm-uniform': 'm-uniform', 'karbala-wc': 'karbala-wc', 'm-agreement': 'm-agreement', 'm-faith': 'm-faith', 'm-saladin': 'm-saladin' }
const only = process.argv.slice(2)
for (const [name, src] of Object.entries(THUMBS)) {
  if (only.length && !only.includes(name)) continue
  const f = GEN + src + '.png'
  if (!existsSync(f)) { console.log('skip', name); continue }
  const { width: W, height: H } = await sharp(f).metadata()
  /* the middle 70% across and 56% down — inside the wash on every vignette measured */
  const left = Math.round(W * 0.15), top = Math.round(H * 0.2)
  await sharp(f).extract({ left, top, width: Math.round(W * 0.7), height: Math.round(H * 0.56) })
    .resize({ width: 900 }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}t-${name}.jpg`)
  console.log('t-' + name)
}
for (const name of ['m-badr', 'm-fajr', 'm-umayyad', 'minbar', 'm-kiswa', 'm-uniform']) {
  if (only.length && !only.includes('s-' + name)) continue
  const f = GEN + THUMBS[name] + '.png'
  const { width: W, height: H } = await sharp(f).metadata()
  await sharp(f).extract({ left: Math.round(W * 0.09), top: Math.round(H * 0.12), width: Math.round(W * 0.82), height: Math.round(H * 0.66) })
    .resize({ width: 1600 }).jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}s-${name}.jpg`)
  console.log('s-' + name)
}
if ((!only.length || only.includes('syria-wide')) && existsSync(GEN + 'syria-wide.png')) {
  await sharp(GEN + 'syria-wide.png').resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(OUT + 'syria-wide.jpg')
  console.log('syria-wide')
}
