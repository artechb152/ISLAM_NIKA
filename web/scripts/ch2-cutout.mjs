/* Cut the danger figures out of their flat white plate.

   A luminance threshold is the obvious approach and the wrong one here: the
   raiders wear undyed wool, so their robes are as bright as the background and
   a threshold punches holes straight through them.

   So flood-fill from the BORDER instead. Only white that is CONNECTED to the
   edge is background; white enclosed by the subject stays opaque. Then blur the
   resulting alpha a little, so the edge is anti-aliased rather than jagged.

   Run: node scripts/ch2-cutout.mjs
*/
import sharp from 'sharp'
import { stat } from 'node:fs/promises'

const IN = 'C:/Users/nikag/AppData/Local/Temp/claude/c--Users-nikag-Downloads/0f56d58f-3acc-48bb-9fc5-a44203cb7647/scratchpad/'
const OUT = 'C:/Users/nikag/Downloads/ISLAM_NIKA/web/public/assets/chapter2/'
const WIDTH = 900
/* how close to white a pixel must be to count as background */
const NEAR_WHITE = 232

for (const name of ['beasts', 'raiders']) {
  const { data, info } = await sharp(IN + name + '.png')
    .resize({ width: WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: w, height: h, channels: ch } = info
  const bg = new Uint8Array(w * h)
  const isWhite = (i) => {
    const p = i * ch
    return data[p] >= NEAR_WHITE && data[p + 1] >= NEAR_WHITE && data[p + 2] >= NEAR_WHITE
  }

  /* BFS from every border pixel that is near-white */
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0
  const push = (i) => {
    if (i < 0 || i >= w * h || bg[i] || !isWhite(i)) return
    bg[i] = 1
    queue[tail++] = i
  }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    push(i - w)
    push(i + w)
  }

  /* Pass 2 — the pockets the border fill cannot reach: the plate between the
     camels' legs, under a belly, inside the crook of an arm. Those are ENCLOSED
     by the subject, so no path from the frame reaches them.

     They are distinguishable from the raiders' undyed robes not by brightness
     but by FLATNESS: the plate is unpainted 255/255/255, while even the palest
     wool carries brush shading. So seed only on near-pure white, spread only
     through near-pure white, and keep a pocket only if it is big enough to be
     background rather than a highlight on the cloth. */
  const SEED = 250
  const SPREAD = 244
  const isFlat = (i, t) => {
    const p = i * ch
    return data[p] >= t && data[p + 1] >= t && data[p + 2] >= t
  }
  let pockets = 0
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || !isFlat(s, SEED)) continue
    const mark = []
    head = 0
    tail = 0
    const push2 = (i) => {
      if (i < 0 || i >= w * h || bg[i] || !isFlat(i, SPREAD)) return
      bg[i] = 2
      mark.push(i)
      queue[tail++] = i
    }
    push2(s)
    while (head < tail) {
      const i = queue[head++]
      const x = i % w
      if (x > 0) push2(i - 1)
      if (x < w - 1) push2(i + 1)
      push2(i - w)
      push2(i + w)
    }
    /* a highlight on cloth is small; a hole in the plate is not */
    if (mark.length < 400) for (const i of mark) bg[i] = 0
    else pockets++
  }

  /* the alpha channel, then a small blur so the cut edge is not stair-stepped */
  const alphaRaw = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) alphaRaw[i] = bg[i] ? 0 : 255
  /* Two traps here, both of which produced a striped image:
       · .toBuffer() without .raw() encodes a PNG, and those bytes read back as
         an alpha plane are noise;
       · even with .raw(), sharp may hand back a 1-channel plane as 3 channels.
     So take the stride from the RESULT rather than assuming it. */
  const { data: blurred, info: aInfo } = await sharp(alphaRaw, { raw: { width: w, height: h, channels: 1 } })
    .blur(1.1)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const aCh = aInfo.channels
  if (blurred.length !== w * h * aCh) throw new Error(`alpha plane is ${blurred.length}, expected ${w * h * aCh}`)

  /* recombine: the original pixels, wearing the new alpha */
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = data[i * ch]
    rgba[i * 4 + 1] = data[i * ch + 1]
    rgba[i * 4 + 2] = data[i * ch + 2]
    rgba[i * 4 + 3] = blurred[i * aCh]
  }

  const out = OUT + name + '.webp'
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 1 }) // drop the empty margin the plate left around the subject
    .webp({ quality: 88, alphaQuality: 94, effort: 6 })
    .toFile(out)

  const cut = (w * h - bg.reduce((a, c) => a + c, 0)) / (w * h)
  console.log(`${name}.webp  ${Math.round((await stat(out)).size / 1024)}KB · ${(cut * 100).toFixed(1)}% kept · ${pockets} enclosed pockets cleared`)
}
