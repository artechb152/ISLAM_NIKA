/* Compress proof screenshots to data URIs for the proposal artifact. */
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const T = join(HERE, 'tour')
const C = join(HERE, '..', 'public', 'assets', 'chapter1', 'concept')
const LIST = {
  'concept':     join(C, 'station7-mecca-v2a.png'),
  'yemen-base':  join(T, 'yemen-heights-1-entry.png'),
  'yemen-combo': join(T, 'lab-yemen-heights-combo.png'),
  'mecca-base':  join(T, 'lab-mecca-base.png'),
  'mecca-atmo':  join(T, 'lab-mecca-atmo.png'),
  'mecca-gold':  join(T, 'lab-mecca-gold.png'),
  'mecca-paint': join(T, 'lab-mecca-paint.png'),
  'mecca-tilt':  join(T, 'lab-mecca-tilt.png'),
  'mecca-iso':   join(T, 'lab-mecca-iso.png'),
  'mecca-cine':  join(T, 'lab-mecca-cine.png'),
  'narrow-base': join(T, 'narrow-pass-1-entry.png'),
  'night-base':  join(T, 'night-camp-1-entry.png'),
}
const out = {}
for (const [k, p] of Object.entries(LIST)) {
  const buf = await sharp(p).resize({ width: 880 }).jpeg({ quality: 72 }).toBuffer()
  out[k] = 'data:image/jpeg;base64,' + buf.toString('base64')
  console.log(k, Math.round(buf.length / 1024) + 'KB')
}
writeFileSync(join(HERE, 'imgs.json'), JSON.stringify(out))
console.log('total', Math.round(Object.values(out).join('').length / 1024) + 'KB')
