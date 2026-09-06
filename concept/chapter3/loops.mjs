/* Turns the raw generations into panel loops the page can afford.

   Two things are wrong with a file straight off the model, and the same two
   were wrong with the chapter 2 banner:

     WEIGHT.  4.5MB for five seconds, at 1080p, for a picture that is drawn
              650px wide on the largest screen the book is read on. Scaled to
              the size it is actually shown at and encoded for a still-ish
              subject, the same motion costs a fraction of that.

     THE SEAM. The clip ends where the model stopped, not where it started, so
              a loop cuts. The tail is cross-faded back into the head, and the
              cut is then MEASURED — last frame against first — rather than
              assumed.

   Both numbers are printed for every clip. */
import { readdir, stat, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from '../../web/node_modules/sharp/lib/index.js'
const run = promisify(execFile)
const FF = 'C:/Users/nikag/ISLAM_NIKA/web/node_modules/ffmpeg-static/ffmpeg.exe'
const DIR = 'C:/Users/nikag/ISLAM_NIKA/web/public/assets/chapter3/comic/motion/'
const TMP = 'C:/Users/nikag/AppData/Local/Temp/claude/C--Users-nikag/19562ce8-acdd-420b-8e32-966c20959c71/scratchpad/'

const W = 960, H = 720, FADE = 0.7          /* the overlap that hides the cut */

/* ⚠ FFPROBE IS NOT IN ffmpeg-static. Asking for it returned nothing, the
   duration parsed as 0, and every clip was trimmed to the one-second floor —
   over its own original, in place. ffmpeg prints the duration to stderr, so it
   is read from there, and a zero now stops the run instead of silently
   becoming one second. */
async function lengthOf(file) {
  const out = await run(FF, ['-i', file]).catch((e) => ({ stderr: e.stderr ?? '' }))
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(out.stderr ?? '')
  if (!m) throw new Error('cannot read the duration of ' + file)
  return +m[1] * 3600 + +m[2] * 60 + +m[3]
}

/* the difference between the last frame and the first, on the same small grid
   the fidelity check uses — this is the cut the reader would see every loop */
async function seam(file) {
  const dur = await lengthOf(file)
  await run(FF, ['-y', '-i', file, '-vframes', '1', '-vf', `scale=${256}:192`, `${TMP}seam-a.png`])
  await run(FF, ['-y', '-sseof', '-0.1', '-i', file, '-vframes', '1', '-vf', `scale=${256}:192`, `${TMP}seam-b.png`])
  const a = await sharp(`${TMP}seam-a.png`).removeAlpha().raw().toBuffer()
  const b = await sharp(`${TMP}seam-b.png`).removeAlpha().raw().toBuffer()
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return { seam: +(s / a.length).toFixed(2), dur: +dur.toFixed(2) }
}

const files = (await readdir(DIR)).filter((f) => f.endsWith('.mp4') && !f.includes('.raw'))
for (const f of files) {
  const id = f.replace('.mp4', '')
  const src = DIR + f
  const raw = `${TMP}${id}.raw.mp4`
  await run('cmd', ['/c', 'copy', '/y', src.replace(/\//g, '\\'), raw.replace(/\//g, '\\')])
  const before = (await stat(src)).size
  const { dur } = await seam(raw)
  if (!(dur > 2)) throw new Error(`${id}: read a duration of ${dur}s — refusing to cut`)
  const keep = dur - FADE

  /* the tail is laid back over the head, so the loop closes on itself */
  await run(FF, ['-y', '-i', raw, '-filter_complex',
    `[0:v]scale=${W}:${H}:flags=lanczos,split[a][b];` +
    `[a]trim=0:${keep.toFixed(2)},setpts=PTS-STARTPTS[main];` +
    `[b]trim=${keep.toFixed(2)}:${dur.toFixed(2)},setpts=PTS-STARTPTS,format=yuva420p,` +
    `fade=t=out:st=0:d=${FADE}:alpha=1[tail];` +
    `[main][tail]overlay=0:0:eof_action=pass,format=yuv420p[v]`,
    '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '30', '-r', '24',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-g', '48', src])

  const after = (await stat(src)).size
  const s = await seam(src)
  console.log(`${id}  ${(before / 1048576).toFixed(1)}MB → ${Math.round(after / 1024)}KB` +
    `  ·  ${s.dur}s  ·  seam ${s.seam}/255`)
  await rm(raw, { force: true })
}
console.log('LOOPS DONE')
