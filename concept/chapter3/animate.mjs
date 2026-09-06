/* Animates the peak panels — image to video, from the painting itself.

   ⚠ THE KNOWN RISK, RECORDED WHEN THE CHAPTER 2 BANNER WAS BUILT: Seedance and
   Kling both REPAINT an oil painting. They invent impasto and speckle, and the
   frame that comes back is no longer the picture that went in. That was
   diagnosed by cropping the same rock out of the painting and out of the video
   and putting them side by side, and it is why that banner ended up being built
   in ffmpeg instead.

   So this script does two things, not one: it generates, and then it MEASURES —
   frame 1 of the result against the source pixel for pixel. If the model has
   repainted, the number says so before anything reaches the book. `checkonly`
   re-measures what is already on disk.

   The prompts ask for one thing to move and everything else to hold still. A
   comic panel that starts drifting as a whole stops being a panel. */
import { writeFile, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from '../../web/node_modules/sharp/lib/index.js'
const ffmpeg = 'C:/Users/nikag/ISLAM_NIKA/web/node_modules/ffmpeg-static/ffmpeg.exe'
const run = promisify(execFile)
const HF = 'C:/Users/nikag/.local/bin/higgsfield.exe'
const ART = 'C:/Users/nikag/ISLAM_NIKA/web/public/assets/chapter3/comic/'
const OUT = 'C:/Users/nikag/ISLAM_NIKA/web/public/assets/chapter3/comic/motion/'
const TMP = 'C:/Users/nikag/AppData/Local/Temp/claude/C--Users-nikag/19562ce8-acdd-420b-8e32-966c20959c71/scratchpad/'

const HOLD = 'The painting itself must not change: keep every brush stroke, every ink line, the exact colours, the exact paper texture and the exact composition. Do not repaint, do not restyle, do not add texture, grain, speckle or impasto, do not sharpen, do not relight. The camera does not move at all. Nothing enters or leaves the frame.'

const JOBS = {
  /* §2 — the birds of the sura of the elephant. The one panel in the chapter
     where the thing that moves IS the event. */
  p03: 'Only the flock of birds moves: they drift slowly across the sky and the small stones they carry fall. The elephant, the soldiers, the ground and the hills are completely still.',
  /* §19 — the first words. FIRST ATTEMPT MEASURED 52.86/255 AGAINST THE
     PAINTING: the model rebuilt the cave in blue-grey rock, redrew the scrolls
     and pulled the camera back. This is the panel in the set whose subject IS
     the light, and a model asked to move light re-renders it. Second attempt
     asks for almost nothing. */
  q30: 'Almost nothing moves. The glow behind the scrolls brightens by a barely perceptible amount and returns. Not one edge, not one shadow and not one stone changes shape or position.',
  /* §42 — the crescent over the empty plain. A sky panel, and the sky panels
     are the ones that survive this process: p57 came back at 5.71/255. */
  q68: 'Only the sky moves: the stars drift very slowly and a thin veil of cloud passes below the crescent. The horizon, the ground and the crescent itself are completely still.',
  /* §6 — the ash. Smoke, and only smoke. */
  q75: 'Only the smoke moves: thin grey smoke drifts slowly upward from the burnt ground and a few flakes of ash lift on the air. The seated figures, their robes, the charred stalks and the sky are completely still.',
  /* §42 — the sacred precinct at night. The sky turns; the stone does not. */
  p57: 'Only the sky moves: the stars drift very slowly and a thin haze passes across the milky way. The stone cube, the standing stones, the hills, the ground and the figure are completely still.',
}

function findUrl(o) {
  if (!o) return null
  if (typeof o === 'string') return /^https?:.*\.(mp4|webm|mov)/i.test(o) ? o : null
  for (const v of Array.isArray(o) ? o : Object.values(o)) { const r = findUrl(v); if (r) return r }
  return null
}

/* HOW MUCH OF THE PAINTING SURVIVED. Frame 1 of the video against the source,
   both reduced to the same small grid: mean absolute difference per channel,
   0 = identical, and anything past a few points is a repaint. */
async function fidelity(id) {
  const frame = `${TMP}${id}-f1.png`
  await run(ffmpeg, ['-y', '-i', `${OUT}${id}.mp4`, '-vframes', '1', '-vf', 'scale=256:192', frame])
  const a = await sharp(`${ART}${id}.jpg`).resize(256, 192, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const b = await sharp(frame).resize(256, 192, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return +(sum / a.length).toFixed(2)
}

await mkdir(OUT, { recursive: true })
const ids = process.argv.slice(2).filter((a) => a !== '--checkonly')
const list = ids.length ? ids : Object.keys(JOBS)

if (process.argv.includes('--checkonly')) {
  for (const id of list) {
    try { console.log(`${id}  drift from the painting: ${await fidelity(id)}/255`) }
    catch (e) { console.log(`${id}  — no video (${String(e.message).slice(0, 60)})`) }
  }
  process.exit(0)
}

let done = 0
async function one(id) {
  try {
    const { stdout } = await run(HF, ['generate', 'create', 'seedance_2_0',
      '--start-image', `${ART}${id}.jpg`,
      '--prompt', `${JOBS[id]} ${HOLD}`,
      '--duration', '5', '--resolution', '1080p', '--aspect_ratio', '4:3',
      '--generate-audio', 'false',
      '--wait', '--wait-timeout', '25m', '--json'],
      { maxBuffer: 64 * 1024 * 1024 })
    const url = findUrl(JSON.parse(stdout))
    if (!url) throw new Error('no video url in response')
    const res = await fetch(url)
    await writeFile(`${OUT}${id}.mp4`, Buffer.from(await res.arrayBuffer()))
    console.log(`✓ ${id} (${++done}/${list.length}) · drift from the painting: ${await fidelity(id)}/255`)
  } catch (e) { console.error(`✗ ${id}: ${String(e.message).slice(0, 200)}`) }
}
const q = [...list]
await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await one(q.shift()) }))
console.log('ANIMATE DONE')
