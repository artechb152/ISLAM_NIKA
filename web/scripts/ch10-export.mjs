/* Chapter 10 — exports a generated painting (concept/chapter10/gen/<name>.png, local, not in
   git) to the site as a 1920-wide JPG in public/assets/chapter10/.
   node scripts/ch10-export.mjs horse-1 [hero-1 …] */
import sharp from 'sharp'
for (const name of process.argv.slice(2)) {
  const out = `public/assets/chapter10/${name}.jpg`
  await sharp(`../concept/chapter10/gen/${name}.png`).resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(out)
  console.log('wrote', out)
}
