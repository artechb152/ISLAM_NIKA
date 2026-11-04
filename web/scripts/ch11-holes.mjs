/* clear enclosed white holes (connected near-white areas > MIN px) inside an already-cut image */
import sharp from 'sharp'
const [f] = process.argv.slice(2), MIN = 400, TOL = 18
const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const wh = (i) => data[i*4+3] > 0 && data[i*4] >= 255-TOL && data[i*4+1] >= 255-TOL && data[i*4+2] >= 255-TOL
const seen = new Uint8Array(W*H); let cleared = 0
for (let s = 0; s < W*H; s++) {
  if (seen[s] || !wh(s)) continue
  const comp = [], q = [s]; seen[s] = 1
  while (q.length) { const i = q.pop(); comp.push(i); const x = i % W
    for (const j of [x ? i-1 : -1, x < W-1 ? i+1 : -1, i-W, i+W]) if (j >= 0 && j < W*H && !seen[j] && wh(j)) { seen[j] = 1; q.push(j) } }
  if (comp.length < MIN) continue
  cleared += comp.length
  /* soft: also fade the pale fringe pixels next to the hole */
  for (const i of comp) data[i*4+3] = 0
  for (const i of comp) for (const j of [i-1,i+1,i-W,i+W]) if (j>=0&&j<W*H&&data[j*4+3]>0) { const m=Math.min(data[j*4],data[j*4+1],data[j*4+2]); if (m>215) data[j*4+3]=Math.round(data[j*4+3]*(255-m)/40) }
}
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 86, alphaQuality: 90 }).toFile(f + '.tmp')
console.log('cleared', cleared)
