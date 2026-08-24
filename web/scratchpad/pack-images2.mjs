/* Round 2: add the new proofs (stills + walk clips) to imgs.json. */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const T = join(HERE, 'tour')
const out = JSON.parse(readFileSync(join(HERE, 'imgs.json'), 'utf8'))
const STILLS = {
  'twoshot-before': join(T, 'border-post-5-dialogue.png'),
  'twoshot-after':  join(T, 'lab2-twoshot.png'),
  'vidtex':         join(T, 'lab2-vidtex.png'),
  'anim-frame':     join(HERE, '..', 'public', 'assets', 'anim-frames', 'scene1.jpg'),
}
for (const [k, p] of Object.entries(STILLS)) {
  const buf = await sharp(p).resize({ width: 880 }).jpeg({ quality: 72 }).toBuffer()
  out[k] = 'data:image/jpeg;base64,' + buf.toString('base64')
  console.log(k, Math.round(buf.length / 1024) + 'KB')
}
for (const k of ['walk-base', 'walk-dust']) {
  const buf = readFileSync(join(T, k + '.mp4'))
  out['vid-' + k] = 'data:video/mp4;base64,' + buf.toString('base64')
  console.log('vid-' + k, Math.round(buf.length / 1024) + 'KB')
}
writeFileSync(join(HERE, 'imgs.json'), JSON.stringify(out))
console.log('total', Math.round(Object.values(out).join('').length / 1024) + 'KB')
