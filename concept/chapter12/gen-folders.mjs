/* תמונות האווירה של תיקים 01, 02, 04, 05 — אותו סגנון כמו טבלת הרבאט (prompts.json.style). */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const { style } = JSON.parse(readFileSync('concept/chapter12/prompts.json', 'utf8'))
const REF = 'web/public/assets/chapter7/cut-herald.webp'
const IMGS = [
  ['f1-path', 'Paint: a steep stone-stepped mountain path climbing through dry rocky terrain at dawn, a red rope rail along one side, a worn red cloth tied to a boulder. No people.'],
  ['f2-fork', 'Paint: a dusty track that splits in two across an open plain, a small red cloth tied to a post at the fork, long soft shadows. No people.'],
  ['f3-roots', 'Paint: an old tree on dry cracked earth with deep exposed roots spreading across the ground, a few red wildflowers growing between the roots. No people.'],
  ['f4-lamp', 'Paint: a small clay oil lamp glowing on a stone ledge at dusk beside a red woven cloth, a quiet courtyard softly blurred behind it. No people, no writing.'],
  ['f5-olives', 'Paint: terraced hillside of old olive trees with dry stone walls in warm afternoon light, red poppies in the grass at the foot of the trees. No people, no buildings with writing.'],
]
for (const [name, p] of IMGS) {
  const out = `concept/chapter12/gen/${name}.png`
  const r = spawnSync('node', ['web/scripts/chatgpt-image.mjs', 'gen', `${p} ${style}`, out, REF], { stdio: 'inherit' })
  console.log(name, 'exit', r.status)
}
