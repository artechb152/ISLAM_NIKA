/* Lift the plates out of the mud.
 *
 * The reference she named is Genshin Impact, and the single biggest gap between
 * that and what we have is not detail or geometry — it is that our world is a
 * dim brown photograph and that one is bright and saturated. A straight grade
 * does not make it stylised, but it closes most of the distance for nothing,
 * and it can be undone: originals stay where they are, graded copies go beside
 * them.
 *
 * A stronger pass that pushed shadows to teal and highlights to gold went badly
 * blue — that direction needs the plates regenerated, not corrected.
 *
 * Run: node brighten.cjs
 */
const sharp = require('c:/Users/nikag/Downloads/ISLAM_NIKA/web/node_modules/sharp')
const fs = require('fs')

const SRC = 'plates', OUT = 'plates-bright'
fs.mkdirSync(OUT, { recursive: true })

;(async () => {
  const files = fs.readdirSync(SRC).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  for (const f of files) {
    const buf = await sharp(`${SRC}/${f}`)
      .modulate({ saturation: 1.55, brightness: 1.12 })
      .linear(1.18, -14)
      .jpeg({ quality: 92 })
      .toBuffer()
    fs.writeFileSync(`${OUT}/${f.replace(/\.(png|jpeg)$/i, '.jpg')}`, buf)
    process.stdout.write('  ' + f + '\n')
  }
  console.log(`\n${files.length} plates lifted → ${OUT}/`)
})()
