/* Chapter 3 · the panel producer.

   Reads panels.json and produces every panel that has no asset yet. The prompt
   is built FROM THE MANIFEST — `art` (the English subject) plus one frozen
   style string plus, where people appear, one frozen face rule. Nothing about
   a panel's content lives in this file, so the manifest cannot drift from what
   is actually generated.

   Run: node concept/chapter3/produce.mjs [--only p12,p13] [--force]
*/
import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const here = new URL('.', import.meta.url)
const OUT = new URL('art/', here)
const HF = 'C:/Users/nikag/.local/bin/higgsfield.exe'

/* FROZEN. This is the string that produced the panel the style was approved on;
   every panel in the chapter carries it verbatim. It is the reason 58 pictures
   read as one book. Do not edit it to fix a single panel — fix that panel's
   `art` instead. */
const STYLE =
  'Comic book panel art. Confident dark brown ink linework over loose flat watercolour ' +
  'washes that do not perfectly follow the lines. Cross-hatching in the shadows, dry-brush ' +
  'texture, areas of bare paper. Strictly limited palette: warm cream paper, ochre and umber ' +
  'stone, deep brown-black shadow, muted grey-blue, and one warm gold. Graphic novel ' +
  'illustration, clean and readable, strong value contrast. No text, no lettering, no speech ' +
  'balloons, no captions, no panel border or frame, no signature, no watermark.'

/* Also frozen. The hair clause is here because without it one panel came back
   with a fully modelled head of curls and a half-drawn face — neither blurred
   nor drawn. The wash has to take the whole head, not just the features. */
const FACES =
  'Every human figure has a DELIBERATELY BLANK AND INDISTINCT HEAD — the whole head, hair ' +
  'included, dissolves into a soft wash with no eyes, no mouth, no features and no hairline, ' +
  'as if the paint faded there; every other part of them is fully drawn in sharp ink line.'

const args = process.argv.slice(2)
const only = args.find((a) => a.startsWith('--only='))?.slice(7)?.split(',')
const force = args.includes('--force')

const panels = JSON.parse(await readFile(new URL('panels.json', here), 'utf8')).panels
await mkdir(OUT, { recursive: true })

const has = async (p) => {
  try { await access(new URL(`${p}.src`, OUT)); return true } catch { return false }
}
/* a panel needs the face rule only if a person may appear in it */
const peopled = (p) => !(p.mustNot ?? []).includes('כל דמות אנוש') &&
  (p.must ?? []).some((m) => m.includes('פנים מטושטשות')) === false
  ? (p.must ?? []).some((m) => /דמות|אנשים|קהל|חייל|נכבד|בנות|מלך|סוחרת|אישה|איש/.test(m)) ||
    (p.must ?? []).some((m) => m.includes('פנים מטושטשות'))
  : true

const todo = []
for (const p of panels) {
  if (only && !only.includes(p.id)) continue
  if (!p.art) { console.log(`— ${p.id}: אין art, מדולג`); continue }
  if (!force && (await has(p.id))) continue
  todo.push(p)
}
console.log(`לייצור: ${todo.length} פאנלים`)

const LIMIT = 6
let done = 0
async function one(p) {
  const wantsFaces = /\bpeople|figures?|men|women|girls|crowd|soldiers|notables|king|merchant|travellers|visitors|inhabitants|workers|townspeople\b/i.test(p.art)
  /* p.avoid carries this panel's own mustNot, rendered in English. Without it
     the declaration never reached the model and five panels drew exactly what
     the manifest forbade. */
  const prompt = [p.art, wantsFaces ? FACES : '', p.avoid ?? '', STYLE].filter(Boolean).join(' ')
  const out = new URL(`${p.id}.json`, OUT)
  try {
    const { stdout } = await run(HF, [
      'generate', 'create', 'gpt_image_2',
      '--aspect_ratio', p.grid === 'splash' ? '3:4' : '4:3',
      '--resolution', '2k', '--quality', 'high',
      '--prompt', prompt, '--wait', '--wait-timeout', '20m', '--json',
    ], { maxBuffer: 32 * 1024 * 1024 })
    await writeFile(out, stdout)
    const url = findUrl(JSON.parse(stdout))
    if (!url) throw new Error('no url in response')
    const res = await fetch(url)
    await writeFile(new URL(`${p.id}.src`, OUT), Buffer.from(await res.arrayBuffer()))
    console.log(`✓ ${p.id}  (${++done}/${todo.length})`)
  } catch (e) {
    console.error(`✗ ${p.id}: ${String(e.message).slice(0, 160)}`)
  }
}
function findUrl(o) {
  if (!o) return null
  if (typeof o === 'string') return /^https?:.*\.(jpg|jpeg|png|webp)/i.test(o) ? o : null
  for (const v of Array.isArray(o) ? o : Object.values(o)) { const r = findUrl(v); if (r) return r }
  return null
}

const queue = [...todo]
await Promise.all(Array.from({ length: LIMIT }, async () => {
  while (queue.length) await one(queue.shift())
}))
console.log('ALL DONE')
