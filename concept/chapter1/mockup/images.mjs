/* Inline the generated scene plates as data: URIs. One plate per screen — no
   background appears twice, and each carries its own hour of the day. */
import fs from 'node:fs'

const NAMES = [
  'study','idols','yemen','birds','dust','street',
  'title', // 00 caravan into the sunrise
  'camp', // 01 night camp, the scribe
  'gate', // 02 stone waystation at cold dawn
  'mesa', // 03 the pass, harsh noon
  'load', // 04 loading the caravan
  'oasis', // 05 Yathrib
  'cliff', // 06 the hermitage at dusk
  'mecca', // 07 the sanctuary at golden hour
  'dust', // 08 the dust wall
  'street', // 09 the town empties
  'army', // 10 Abraha's host
  'ridge', // 11 the morning after
  'night', // 12 closing, the lamp and the table
]

const CAST = ['rawi', 'chief', 'merchant', 'scholar', 'monk', 'envoy']

let css = ':root{\n'
let total = 0
for (const name of [...NAMES, 'worldmap']) {
  const buf = fs.readFileSync(`plates/${name}.jpg`)
  total += buf.length
  css += `--img-${name}:url(data:image/jpeg;base64,${buf.toString('base64')});\n`
}
for (const name of CAST) {
  const buf = fs.readFileSync(`faces/${name}.jpg`)
  total += buf.length
  css += `--face-${name}:url(data:image/jpeg;base64,${buf.toString('base64')});\n`
  // full-body transparent cutout (webp payload despite the .png extension)
  const cut = fs.readFileSync(`chars/${name}.png`)
  total += cut.length
  css += `--char-${name}:url(data:image/webp;base64,${cut.toString('base64')});\n`
}
css += '}\n'

fs.writeFileSync('images.css', css, 'utf8')
console.log(NAMES.length, 'plates ·', (css.length / 1024 / 1024).toFixed(2), 'MB encoded')
