/* Turns the whole book and photographs every spread, then montages them so the
   finished thing can be LOOKED at end to end rather than reasoned about. */
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdir, readdir, unlink } from 'node:fs/promises'

const OUT = 'C:/Users/nikag/ISLAM_NIKA/concept/chapter3/sweep/'
await mkdir(OUT, { recursive: true })
for (const f of await readdir(OUT)) await unlink(OUT + f)

const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
/* every picture must have decoded before anything is photographed: a sweep run
   straight after a recompile came back with half the panels blank, which looks
   exactly like a layout bug and is not one */
await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : i.decode().catch(() => 0))))

const sheets = await p.evaluate(() => document.querySelectorAll('.c3-sheet').length)
const shots = []
for (let n = 1; n <= sheets - 1; n++) {
  if (true) { await p.click('.c3-arrow.is-next'); await p.waitForTimeout(420) }
  /* the label is READ OFF THE PAGE rather than counted from the loop, so a
     montage can never say one thing while showing another */
  const folios = await p.evaluate(() =>
    [...document.querySelectorAll('.c3-page.is-live .c3-folio')]
      .map((e) => e.textContent).reverse().join(' / '))
  const buf = await p.locator('.c3-book').screenshot()
  shots.push({ n, folios, buf: await sharp(buf).resize(880, null, { fit: 'inside' }).toBuffer() })
}
console.log(`spreads captured: ${shots.length}`)
await b.close()

const PER = 8, TW = 880, LAB = 20
for (let s = 0; s * PER < shots.length; s++) {
  const run = shots.slice(s * PER, s * PER + PER)
  const metas = await Promise.all(run.map((r) => sharp(r.buf).metadata()))
  const TH = Math.max(...metas.map((m) => m.height))
  const rows = Math.ceil(run.length / 2)
  const comp = []
  for (const [k, r] of run.entries()) {
    const x = (k % 2) * TW, y = Math.floor(k / 2) * (TH + LAB)
    comp.push({ input: r.buf, left: x, top: y + LAB })
    comp.push({
      input: Buffer.from(
        `<svg width="${TW}" height="${LAB}"><rect width="${TW}" height="${LAB}" fill="#571820"/>` +
        `<text x="6" y="15" font-family="Arial" font-size="13" fill="#f5ecd6">` +
        `spread ${r.n} — folios ${r.folios}</text></svg>`),
      left: x, top: y,
    })
  }
  await sharp({ create: { width: TW * 2, height: rows * (TH + LAB), channels: 3, background: '#efe6d2' } })
    .composite(comp).jpeg({ quality: 78 }).toFile(`${OUT}sweep${s + 1}.jpg`)
  console.log(`sweep${s + 1}.jpg — spreads ${run[0].n}–${run[run.length - 1].n}`)
}
