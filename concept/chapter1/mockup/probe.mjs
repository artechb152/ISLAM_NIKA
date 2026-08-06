/* Report where every world-anchored element actually lands inside its frame,
   as a percentage of the frame box. Eyeballing screenshots is not enough when
   translate(-50%,-100%) shifts an element by its own height. */
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--window-size=1500,1000', '--disable-gpu-sandbox'],
  defaultViewport: { width: 1500, height: 1000 },
})
const page = await browser.newPage()
await page.goto(
  'file:///C:/Users/wolft/AppData/Local/Temp/claude/c--Users-wolft-Desktop------/191e2dcd-12ce-4fb5-b475-f1edd13163c4/scratchpad/mock/screens.html',
  { waitUntil: 'networkidle0' },
)
await new Promise((r) => setTimeout(r, 1500))

const out = await page.evaluate(() => {
  const res = {}
  document.querySelectorAll('.entry').forEach((e, i) => {
    const items = []
    // measure against the element's OWN frame — an entry can hold a 2x2 strip
    e.querySelectorAll('.act,.ring,.sub,.dbox,.choices,.comp,.toast,.saved,.savecard').forEach((el) => {
      const f = el.closest('.frame').getBoundingClientRect()
      const r = el.getBoundingClientRect()
      items.push({
        c: el.className.split(' ')[0],
        t: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 16),
        x: +(((r.left - f.left) / f.width) * 100).toFixed(1),
        y: +(((r.top - f.top) / f.height) * 100).toFixed(1),
        w: +((r.width / f.width) * 100).toFixed(1),
        h: +((r.height / f.height) * 100).toFixed(1),
      })
    })
    res[i] = items
  })
  return res
})

/* Overlap detector. Every readable thing in a frame — panels, markers, prompts,
   sockets — has to be legible, so any real intersection between two of them is
   a bug. Reported as % of the smaller box that is covered. */
const clashes = await page.evaluate(() => {
  const SEL =
    '.act,.ring,.sub,.dbox,.choices,.comp,.toast,.saved,.savecard,.tcard,.nb'
  const out = []
  document.querySelectorAll('.entry').forEach((e, i) => {
    const els = [...e.querySelectorAll(SEL)].map((el) => ({
      name: el.className.split(' ').filter((c) => c !== 'panel')[0],
      t: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14),
      r: el.getBoundingClientRect(),
    }))
    for (let a = 0; a < els.length; a++) {
      for (let b = a + 1; b < els.length; b++) {
        const A = els[a].r
        const B = els[b].r
        const w = Math.min(A.right, B.right) - Math.max(A.left, B.left)
        const h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top)
        if (w <= 0 || h <= 0) continue
        const cover = (w * h) / Math.min(A.width * A.height, B.width * B.height)
        if (cover > 0.06) {
          out.push(`frame ${i}: ${els[a].name}(${els[a].t}) × ${els[b].name}(${els[b].t}) — ${(cover * 100) | 0}%`)
        }
      }
    }
  })
  return out
})
console.log(clashes.length ? 'OVERLAPS:\n' + clashes.join('\n') : 'OVERLAPS: none')

const only = process.argv.slice(2)
for (const i of only.length ? only : Object.keys(out)) {
  console.log('--- frame', i, '---')
  for (const it of out[i]) {
    const bad = it.y < 8.5 || it.y + it.h > 99 || it.x < 0.5 || it.x + it.w > 99.5
    console.log(
      `${it.c.padEnd(8)} ${String(it.x).padStart(5)},${String(it.y).padStart(5)}  ` +
        `${it.w}x${it.h}  ${it.t}${bad ? '   <-- OFF' : ''}`,
    )
  }
}
await browser.close()
