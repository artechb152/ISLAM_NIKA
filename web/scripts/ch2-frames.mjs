/* Convert the five desert stage frames from the generator's PNGs to web JPEGs.
   A full-screen stage preloads every frame, so 2MB apiece is not an option:
   at 1920 wide and q82 they land near 300KB and the crossfade stays instant. */
import sharp from 'sharp'
import { readdir, stat, unlink } from 'node:fs/promises'

const DIR = 'C:/Users/nikag/Downloads/ISLAM_NIKA/web/public/assets/chapter2/'
const names = (await readdir(DIR)).filter((f) => /^desert-\d\.png$/.test(f)).sort()

for (const png of names) {
  const jpg = png.replace(/\.png$/, '.jpg')
  await sharp(DIR + png).resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(DIR + jpg)
  const before = (await stat(DIR + png)).size
  const after = (await stat(DIR + jpg)).size
  await unlink(DIR + png)
  console.log(`${jpg}  ${(before / 1024 / 1024).toFixed(1)}MB → ${Math.round(after / 1024)}KB`)
}
