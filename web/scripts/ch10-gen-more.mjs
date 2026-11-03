/* Chapter 10, second round of stills (3.11.2026): one small painting per column, in pairs.
   Runs chatgpt-image.mjs one prompt at a time (the profile is locked per run). */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const P = JSON.parse(readFileSync('../concept/chapter10/prompts.json', 'utf8'))
const MORE = [
  ['midian-1', 'Paint: an ancient stone well in a wide desert valley of Midian at golden afternoon, red sandstone cliffs behind, a few sheep resting by stone troughs, a deep red woven cloth draped over the edge of the well; one small shepherd far away, seen from behind.'],
  ['fields-1', 'Paint: poor terraced farm fields on the slopes of coastal mountains in Syria in early morning, a humble stone-and-mud farmhouse, a wooden plough left in a furrow, a red cloth bundle on a low stone wall; one small farmer far away bent over the soil, seen from behind.'],
  ['port-1', 'Paint: the small old harbour of a Levantine coastal town in the early twentieth century, bright morning, an anchored steamship and wooden fishing boats, stone warehouses with red-tiled roofs and a red awning; tiny distant figures on the quay seen from behind; no flags.'],
  ['damascus-1', 'Paint: the old city of Damascus seen from a hillside in warm late afternoon, a dense sea of flat roofs, domes and minarets, a bare mountain behind; a red carpet hung over a rooftop rail in the foreground. No people.'],
  ['suwayda-1', 'Paint: a village of dark basalt stone houses on a volcanic hill in southern Syria, bright clear morning, stone walls between small orchards and vineyards, a red wooden door and a red cloth drying on a flat roof, wide sky. No people.'],
]
for (const [name, prompt] of MORE) {
  const out = `../concept/chapter10/gen/${name}.png`
  if (existsSync(out)) { console.log('skip', name); continue }
  console.log('gen', name)
  execFileSync('node', ['scripts/chatgpt-image.mjs', 'gen', `${prompt} ${P.style}`, out, '../concept/chapter10/gen/horse-1.png'], { stdio: 'inherit' })
  if (!P.images.some((i) => i.name === name)) P.images.push({ name, prompt })
}
writeFileSync('../concept/chapter10/prompts.json', JSON.stringify(P, null, 2) + '\n')
console.log('done')
