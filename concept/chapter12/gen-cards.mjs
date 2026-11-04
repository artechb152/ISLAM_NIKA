/* תמונות לכרטיסיות הזוגות (תיקים 01, 02, 04) — אותו סגנון. בלי דמויות: הדמויות מיוצגות בחפץ. */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const { style } = JSON.parse(readFileSync('concept/chapter12/prompts.json', 'utf8'))
const REF = 'web/public/assets/chapter7/cut-herald.webp'
const IMGS = [
  ['c1-effort', 'Paint: a worn walking staff and a pair of dusty leather sandals beside a red cloth bundle at the foot of a steep sand dune, soft light. No people.'],
  ['c2-drum', 'Paint: a large old copper war drum resting on a stone step with a red cloth draped over it, a dusty plain behind. No people.'],
  ['c3-jars', 'Paint: a long row of many clay water jars lined up along an old stone well wall, a red cord tied around each neck. No people.'],
  ['c4-jar', 'Paint: a single clay water jar alone on a worn stone doorstep, a red cloth beside it, soft shade. No people.'],
  ['c5-lane', 'Paint: a narrow lane of mud-brick houses in an Egyptian town in morning light, one wooden door painted red. No people, no signs, no writing.'],
  ['c6-window', 'Paint: a small iron-barred window in a thick stone wall, a red cloth lying on the sill, cold grey light. No people.'],
  ['c7-boat', 'Paint: a calm river bank at dusk with reeds and an empty wooden boat, a red cloth tied to its bow. No people.'],
  ['c8-shield', 'Paint: the edge of a dusty abandoned field with a cracked wooden round shield lying on the ground and a torn red cloth beside it. No people, no flags.'],
]
for (const [name, p] of IMGS) {
  const r = spawnSync('node', ['web/scripts/chatgpt-image.mjs', 'gen', `${p} ${style}`, `concept/chapter12/gen/${name}.png`, REF], { stdio: 'inherit' })
  console.log(name, 'exit', r.status)
}
