/* Produces only the panels the beat split created. Same frozen style string and
   same face rule as produce.mjs — a new picture that does not carry them would
   not belong to the same book. */
import { readFile, writeFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const here = new URL('.', import.meta.url)
const OUT = new URL('art/', here)
const HF = 'C:/Users/nikag/.local/bin/higgsfield.exe'
const STYLE = 'Comic book panel art. Confident dark brown ink linework over loose flat watercolour washes that do not perfectly follow the lines. Cross-hatching in the shadows, dry-brush texture, areas of bare paper. Strictly limited palette: warm cream paper, ochre and umber stone, deep brown-black shadow, muted grey-blue, and one warm gold. Graphic novel illustration, clean and readable, strong value contrast. No text, no lettering, no speech balloons, no captions, no panel border or frame, no signature, no watermark.'
const FACES = 'Every human figure has a DELIBERATELY BLANK AND INDISTINCT HEAD — the whole head, hair included, dissolves into a soft wash with no eyes, no mouth, no features and no hairline, as if the paint faded there; every other part of them is fully drawn in sharp ink line.'
const panels = JSON.parse(await readFile(new URL('panels75.json', here), 'utf8')).panels
const todo = []
for (const p of panels) {
  if (!p.needsArt) continue
  try { await access(new URL(`${p.id}.src`, OUT)); continue } catch {}
  todo.push(p)
}
console.log('לייצור:', todo.length)
function findUrl(o) {
  if (!o) return null
  if (typeof o === 'string') return /^https?:.*\.(jpg|jpeg|png|webp)/i.test(o) ? o : null
  for (const v of Array.isArray(o) ? o : Object.values(o)) { const r = findUrl(v); if (r) return r }
  return null
}
let done = 0
async function one(p) {
  const faces = /robed figures|people|figures/i.test(p.art)
  const prompt = [p.art, faces ? FACES : '', p.avoid ?? '', STYLE].filter(Boolean).join(' ')
  try {
    const { stdout } = await run(HF, ['generate', 'create', 'gpt_image_2',
      '--aspect_ratio', p.grid === 'splash' ? '3:4' : '4:3',
      '--resolution', '2k', '--quality', 'high',
      '--prompt', prompt, '--wait', '--wait-timeout', '20m', '--json'],
      { maxBuffer: 32 * 1024 * 1024 })
    const url = findUrl(JSON.parse(stdout))
    if (!url) throw new Error('no url')
    const res = await fetch(url)
    await writeFile(new URL(`${p.id}.src`, OUT), Buffer.from(await res.arrayBuffer()))
    console.log(`✓ ${p.id} (${++done}/${todo.length})`)
  } catch (e) { console.error(`✗ ${p.id}: ${String(e.message).slice(0, 120)}`) }
}
const queue = [...todo]
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await one(queue.shift()) }))
console.log('ALL DONE')
