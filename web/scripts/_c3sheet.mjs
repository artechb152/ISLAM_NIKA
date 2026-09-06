/* A contact sheet of every picture in the comic, in STORY order, each tile
   labelled with its panel number and asset id — so the whole book can be looked
   at rather than reasoned about. */
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const M = JSON.parse(await readFile('C:/Users/nikag/ISLAM_NIKA/concept/chapter3/panels75.json', 'utf8'))
const DIR = 'C:/Users/nikag/ISLAM_NIKA/web/public/assets/chapter3/comic/'
const OUT = 'C:/Users/nikag/ISLAM_NIKA/concept/chapter3/shots/'
const TW = 300, TH = 225, LAB = 22, COLS = 5, ROWS = 5, PER = COLS * ROWS

for (let s = 0; s * PER < M.panels.length; s++) {
  const run = M.panels.slice(s * PER, s * PER + PER)
  const rows = Math.ceil(run.length / COLS)
  const W = COLS * TW, H = rows * (TH + LAB)
  const comp = []
  for (const [k, p] of run.entries()) {
    const x = (k % COLS) * TW, y = Math.floor(k / COLS) * (TH + LAB)
    comp.push({
      input: await sharp(DIR + p.assetId + '.jpg').resize(TW, TH, { fit: 'cover' }).toBuffer(),
      left: x, top: y + LAB,
    })
    const n = s * PER + k + 1
    const txt = `#${n}  ${p.assetId}  ${p.grid}${p.epilogue ? ' EPI' : ''}`
    comp.push({
      input: Buffer.from(
        `<svg width="${TW}" height="${LAB}"><rect width="${TW}" height="${LAB}" fill="#571820"/>` +
        `<text x="6" y="16" font-family="Arial" font-size="13" fill="#f5ecd6">${txt}</text></svg>`),
      left: x, top: y,
    })
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: '#efe6d2' } })
    .composite(comp).jpeg({ quality: 82 }).toFile(`${OUT}sheet${s + 1}.jpg`)
  console.log(`sheet${s + 1}.jpg — panels ${s * PER + 1}–${s * PER + run.length}`)
}
