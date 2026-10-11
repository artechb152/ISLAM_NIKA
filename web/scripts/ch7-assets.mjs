/* פרק 7 · דחיסת הנכסים שנוצרו ב-Higgsfield (ראו concept/chapter7/ASSET-MANIFEST.md).
   ה-PNG המקוריים יושבים ב-concept/chapter7/source-art (מחוץ ל-public ומחוץ ל-git —
   75MB שלא צריכים לעלות לאתר); העמוד טוען רק את ה-webp שבתיקיית הנכסים.
   ריצה: node scripts/ch7-assets.mjs */
import sharp from 'sharp'
import { stat } from 'node:fs/promises'
const SRC = new URL('../../concept/chapter7/source-art/', import.meta.url).pathname
const A = new URL('../public/assets/chapter7/', import.meta.url).pathname
const jobs = [
  /* only what the article uses: the night sky (the 30th night) — dusk becomes the
     banner's poster jpg below; evening and dawn were the journey's and are not shipped */
  ['sky-night', 2400, 74],
  ['year-wheel', 1400, 80],
  ...['hijra', 'rajab', 'watcher', 'hajj', 'herald'].map((n) => [`cut-${n}`, 1100, 82]),
]
for (const [name, max, q] of jobs) {
  await sharp(SRC + name + '.png').resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: q, alphaQuality: 90 }).toFile(A + name + '.webp')
  const { size } = await stat(A + name + '.webp')
  console.log(name.padEnd(12), (size / 1024).toFixed(0) + 'KB')
}
await sharp(SRC + 'sky-dusk.png').resize({ width: 1920 }).jpeg({ quality: 80 }).toFile(A + 'hero-poster.jpg')
console.log('hero-poster.jpg')
