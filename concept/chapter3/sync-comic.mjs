/* Builds the comic's runtime data from the manifest.

   panels75.json is the production manifest — it carries the art prompts, the
   must/mustNot declarations and the eye-check findings, none of which the
   browser needs. This writes the reading copy, and it is the ONE place that
   decides which VOICE each beat is spoken in. That decision is data, not CSS:

     time  the four dates the story leaps to. A dark plate at the top of the
           picture, the way a comic stamps "MECCA, 570".
     v     the five Quranic verses. The gold card they carry everywhere else in
           the product. Never reworded — verify-beats.mjs checks them against
           SOURCE-TEXT.md, word for word.
     say   the three lines of direct speech. A balloon, and its tail LEAVES THE
           PANEL, because the two who speak in this book — Muhammad and Gabriel
           — are never drawn. An off-panel tail is the one comics device that
           says "he is speaking and he is not in the frame", which is exactly
           the constraint this chapter is built on.
     n     everything else: the narrator, in the band under the picture.

   One page holds one picture. The picture is 4:3 and so is the space it is
   given, so nothing is cropped and nothing is covered — the narration lives
   under the picture, on paper. */
import { readFile, writeFile } from 'node:fs/promises'
import sharp from '../../web/node_modules/sharp/lib/index.js'
import { fileURLToPath } from 'node:url'

const here = new URL('.', import.meta.url)
const M = JSON.parse(await readFile(new URL('panels75.json', here), 'utf8'))
const B = JSON.parse(await readFile(new URL('beats.json', here), 'utf8'))

const VERSE = new Set(['q17', 'q22', 'q30', 'q67', 'q68'])
const SAY = new Set(['q27', 'q28', 'q41'])
/* the four dates the story jumps to; each is the first beat of its panel */
const TIME = new Set(['q01', 'q25', 'q46', 'q52'])

/* ⚠ THE TWO FILES MUST SAY THE SAME THING, AND THEY DID NOT.
   beats.json is where the narration is written and corrected; panels75.json
   carries a COPY of every beat next to its picture. Three corrections had been
   made in beats.json and never reached the manifest — and the manifest is what
   this script reads, so the book shipped the uncorrected text for weeks:

     §2   the term אבאביל was printed a whole panel BEFORE the word ציפורים
          that defines it, where the source reads 'שלח אללה ציפורים (אבאביל)'
     §18  the line that the balloon on the next panel answers was missing
     §39  one ten-word beat still carried two separate moments

   A silent copy is a bug waiting to be re-found. The two are compared here, in
   order, and a single difference stops the build. */
const flat = (xs) => xs.map((b) => b.s + '|' + b.t)
const fromBeats = flat(B.parts.flatMap((p) => p.beats))
const fromManifest = flat(M.panels.flatMap((p) => p.beats))
if (fromBeats.length !== fromManifest.length) {
  throw new Error(
    `beats.json holds ${fromBeats.length} beats and panels75.json holds ` +
    `${fromManifest.length}. A beat was added or split in one and not the other.`)
}
for (let i = 0; i < fromBeats.length; i++) {
  if (fromBeats[i] !== fromManifest[i]) {
    throw new Error(
      `beat ${i} differs between the two files:\n` +
      `  beats.json     ${fromBeats[i]}\n` +
      `  panels75.json  ${fromManifest[i]}`)
  }
}

const titles = B.parts.map((p) => p.title)
const pages = M.panels.map((p) => ({
  a: p.assetId,
  p: titles.indexOf(p.part),
  ...(p.epilogue ? { e: 1 } : {}),
  b: p.beats.map((b, i) => ({
    t: b.t,
    s: b.s,
    ...(VERSE.has(p.id) && b.v ? { k: 'v' }
      : SAY.has(p.id) && b.v ? { k: 'say' }
      : TIME.has(p.id) && i === 0 ? { k: 'time' } : {}),
  })),
}))

/* ---- the motion layer ----

   The page turn, the pictures, the text and the menus are untouched; what is
   added is a layer ABOVE the picture and a slow camera on it. Two rules kept
   the motion from becoming decoration:

     · IT IS DERIVED FROM THE PICTURE, not chosen page by page. Every asset is
       measured here — mean brightness, and how blue it is — and a night sky
       gets drifting stars where a noon desert gets hanging dust. A picture the
       reader has not been given yet cannot get the wrong weather.
     · THE CAMERA FOLLOWS THE LIGHT. A bright picture is pushed into slowly, a
       dark one is pulled out of, so the move reveals rather than crowds.

   Four assets are named by hand because what moves in them is a fact of the
   story rather than of their pixels: the birds of §2, the light of the cave in
   §18–§19, and the ash of §5–§6. */
const BY_HAND = {
  p03: 'birds',                                   /* §2 · ואז שלח אללה את האבאביל */
  p25: 'light', p26: 'light', q29: 'light', q30: 'light',  /* §18–§19 · המערה */
  p08: 'embers', q74: 'embers', q75: 'embers',    /* §5–§6 · שדה המוץ והאפר */
}
/* the four spreads the chapter turns on. On these the room around the book
   takes the colour of the page — nothing else about them changes. */
const PEAKS = new Set([4, 30, 67, 68, 75])

for (const pg of pages) {
  const src = fileURLToPath(new URL('../../web/public/assets/chapter3/comic/' + pg.a + '.jpg', here))
  const { data, info } = await sharp(src)
    .resize(32, 24, { fit: 'cover' }).raw().toBuffer({ resolveWithObject: true })
  let lum = 0, blue = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    lum += 0.299 * r + 0.587 * g + 0.114 * b
    blue += b - (r + g) / 2
  }
  const n = data.length / info.channels
  lum /= n; blue /= n
  const dark = lum < 96
  pg.m = BY_HAND[pg.a] ?? (dark || blue > 8 ? 'stars' : 'dust')
  pg.c = dark ? 'out' : 'in'
}
for (const [i, pg] of pages.entries()) if (PEAKS.has(i + 1)) pg.peak = 1

/* ---- the number every panel carries ----
   Straight through the book, 1 to 75, not restarted per page. A reader who has
   just finished panel 31 looks for 32, and it may be on the next tier, the next
   page or over the fold; one running count answers all three. */
for (const [i, pg] of pages.entries()) pg.n = i + 1

/* ---- where each painting should be cropped ----
   A wide tier shows only 53% of a 4:3 painting's height, so something is always
   thrown away and centred is not always right.

   ⚠ THE FIRST VERSION OF THIS TOOK THE MEDIAN OF THE ROW ENERGY, AND THE MEDIAN
   OF A STANDING FIGURE IS ITS WAIST. Panel 10 came back with both women cut off
   at the neck. The median is the right answer only when the subject is SHORTER
   than the window; when it is taller, something has to go, and it must be the
   feet.

   So the subject is bounded first — the rows between the 10th and 90th
   percentile of edge energy — and then:
     · subject fits in the window  → centre the window on it
     · subject is taller           → hang the window from just above its top,
                                     which keeps heads and loses ground
   The result is expressed the way object-position wants it: a percentage of the
   travel the image has left over inside its frame. */
for (const pg of pages) {
  const src = fileURLToPath(new URL('../../web/public/assets/chapter3/comic/' + pg.a + '.jpg', here))
  const W = 64, H = 48
  const g = await sharp(src).resize(W, H, { fit: 'fill' }).greyscale().raw().toBuffer()
  const rows = []
  for (let y = 0; y < H; y++) {
    let e = 0
    for (let x = 1; x < W; x++) {
      e += Math.abs(g[y * W + x] - g[y * W + x - 1])
      if (y) e += Math.abs(g[y * W + x] - g[(y - 1) * W + x])
    }
    rows.push(e)
  }
  const total = rows.reduce((a, b) => a + b, 0) || 1
  const at = (q) => {
    let acc = 0
    for (let y = 0; y < H; y++) { acc += rows[y]; if (acc >= total * q) return y }
    return H - 1
  }
  const top = at(0.10), bot = at(0.90)          /* the subject's own bounds */
  const win = H * (4 / 3) / 2.51                /* what a wide tier can show */
  const room = H - win                          /* the travel the image has  */
  const y = (bot - top) <= win
    ? (top + bot) / 2 - win / 2                 /* it fits: centre on it      */
    : top - H * 0.04                            /* it does not: keep the top  */
  pg.op = Math.round(Math.min(100, Math.max(0, (y / room) * 100)))
}

/* ---- the panels that are films ----
   A handful of peak panels were run through image-to-video and kept ONLY where
   the painting survived it. animate.mjs measures frame 1 against the source and
   prints the drift; the cave of §19 came back at 52.86/255 — rebuilt in
   blue-grey rock with the scrolls redrawn — and is excluded by that number, not
   by taste. Whatever is on disk here is what passed. */
const { statSync } = await import('node:fs')
for (const pg of pages) {
  try {
    const f = fileURLToPath(
      new URL('../../web/public/assets/chapter3/comic/motion/' + pg.a + '.mp4', here))
    if (statSync(f).size > 20000) pg.film = 1
  } catch {}
}

const parts = titles.map((title, i) => ({ title, first: pages.findIndex((x) => x.p === i) + 1 }))

/* every voice must have landed on a page, or a treatment written in CSS is
   decorating nothing */
const seen = {}
for (const pg of pages) for (const b of pg.b) seen[b.k ?? 'n'] = (seen[b.k ?? 'n'] ?? 0) + 1
if (!seen.v || !seen.say || !seen.time) throw new Error('a voice reached no beat: ' + JSON.stringify(seen))
if (parts.some((x) => !x.first)) throw new Error('a part has no page')

await writeFile(
  new URL('../../web/src/lib/chapter3/comic.json', here),
  JSON.stringify({ parts, pages }, null, 1) + '\n')
const weather = {}
for (const pg of pages) weather[pg.m] = (weather[pg.m] ?? 0) + 1
const ops = pages.map((p) => p.op)
console.log('חיתוך: ממוצע', Math.round(ops.reduce((a, b) => a + b, 0) / ops.length) + '%',
  '· הוזז מהמרכז:', ops.filter((o) => Math.abs(o - 50) > 6).length + '/' + ops.length)
console.log('אווירה:', JSON.stringify(weather), '· שיא:', pages.filter((p) => p.peak).length, '· מונפשים:', pages.filter((p) => p.film).map((p) => p.a).join(', ') || 'אין')
console.log(`comic.json · ${pages.length} עמודים · ${parts.length} חלקים · קולות ${JSON.stringify(seen)}`)
