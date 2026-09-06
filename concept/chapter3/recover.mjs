/* Pulls the four generations back down from the account's history.

   They were destroyed locally by a bug in loops.mjs: it read the clip's length
   with ffprobe, ffprobe is not shipped inside ffmpeg-static, the length came
   back 0, and every clip was therefore trimmed to the one-second floor — over
   the original, in place. Nothing needs regenerating: the jobs are still on the
   account, and each one is identified here by the start image it was given. */
import { writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const HF = 'C:/Users/nikag/.local/bin/higgsfield.exe'
const OUT = 'C:/Users/nikag/ISLAM_NIKA/web/public/assets/chapter3/comic/motion/'

/* the phrase unique to each of the four prompts */
const MARK = {
  p03: 'flock of birds',
  p57: 'milky way',
  q68: 'veil of cloud',
  q75: 'flakes of ash',
}

const { stdout } = await run(HF, ['generate', 'list', '--json'], { maxBuffer: 64 * 1024 * 1024 })
const jobs = JSON.parse(stdout).filter((j) => j.job_type === 'seedance_2_0')

function findUrl(o) {
  if (!o) return null
  if (typeof o === 'string') return /^https?:.*\.(mp4|webm|mov)/i.test(o) ? o : null
  for (const v of Array.isArray(o) ? o : Object.values(o)) { const r = findUrl(v); if (r) return r }
  return null
}

for (const [id, mark] of Object.entries(MARK)) {
  /* newest first, so the retry of a panel wins over its first attempt */
  const job = jobs.find((j) => String(j.params?.prompt ?? '').includes(mark))
  if (!job) { console.error(`✗ ${id}: no job whose prompt says "${mark}"`); continue }
  const url = findUrl(job)
  if (!url) { console.error(`✗ ${id}: job ${job.id} carries no video url`); continue }
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(`${OUT}${id}.mp4`, buf)
  console.log(`✓ ${id}  ${(buf.length / 1048576).toFixed(1)}MB  (job ${job.id.slice(0, 8)})`)
}
console.log('RECOVER DONE')
