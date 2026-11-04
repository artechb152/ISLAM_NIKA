/* פרק 13 · הטקסטורות של האולם לרשת.
   המקור: concept/chapter13/blender/tex (Poly Haven CC0, 2k). לרשת — 1k jpg, ואת מפות
   הנורמל והחספוס ב-512: בגובה העיניים באולם ההבדל לא נראה, וכל קובץ עולה בטעינה.
   הדגלים עצמם (flags/sNN.png) מועתקים כמו שהם — הם החיתוכים מהחוברת.
   הרצה: node scripts/chapter13-tex.mjs */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SRC = new URL('../../concept/chapter13/blender/tex/', import.meta.url)
const OUT = new URL('../public/assets/chapter13/tex/', import.meta.url)
await mkdir(OUT, { recursive: true })

for (const base of ['herringbone_parquet', 'plastered_wall_02', 'velour_velvet']) {
  for (const [kind, size] of [['diff', 1024], ['nor_gl', 512], ['rough', 512]]) {
    const name = `${base}_${kind}`
    await sharp(fileURLToPath(new URL(`${name}.jpg`, SRC)))
      .resize(size, size)
      .jpeg({ quality: kind === 'diff' ? 82 : 88 })
      .toFile(fileURLToPath(new URL(`${name}.jpg`, OUT)))
    console.log(name, size)
  }
}
