/* Measures every panel of the live comic without turning a page: all sheets are
   in the DOM at once and every page is laid out at its real size, so the
   geometry is honest even for the faces the reader has not reached.

   What it checks, on every panel:
     ratio   the panel's frame — a tier keeps 86% of a 4:3 painting, a third of
             a page keeps 56%. Anything squarer than about 1.2 is throwing the
             picture away and is a layout bug, not a taste.
     cover   how much of the picture the lettering stands on
     bleed   a box crossing its own panel border
     collide two boxes overlapping each other
     tiny    body text under 13px on this window

   ⚠ THIS SCRIPT MEASURES SIZES, NOT LEFT-RIGHT ORDER. The back face of an
   unturned sheet carries rotateY(180deg), so getBoundingClientRect gives its
   children MIRRORED x — half the paired tiers read backwards here and read
   perfectly on screen. Reading order has to be checked by turning the pages and
   looking only at .c3-page.is-live. */
import { chromium } from 'playwright-core'

const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 140)))
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle' })
await p.waitForTimeout(1600)

const R = await p.evaluate(() => {
  const rows = []
  const pages = []
  document.querySelectorAll('.c3-page').forEach((page) => {
    if (page.classList.contains('is-blank') || page.classList.contains('is-end')) return
    const folio = +(page.querySelector('.c3-folio')?.textContent ?? 0)
    const tpl = [...page.classList].find((c) => ['is-two', 'is-three', 'is-hero'].includes(c))
    pages.push(tpl)
    page.querySelectorAll('.c3-pn').forEach((pn) => {
      const A = pn.getBoundingClientRect()
      const boxes = [...pn.querySelectorAll('.c3-cap,.c3-say,.c3-verse,.c3-stamp')]
      let area = 0, bleed = 0
      const rects = boxes.map((el) => el.getBoundingClientRect())
      for (const r of rects) {
        area += r.width * r.height
        if (r.left < A.left - 2 || r.right > A.right + 2 ||
            r.top < A.top - 2 || r.bottom > A.bottom + 2) bleed++
      }
      let collide = 0
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const ox = Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left)
          const oy = Math.min(rects[i].bottom, rects[j].bottom) - Math.max(rects[i].top, rects[j].top)
          if (ox > 1 && oy > 1) collide++
        }
      }
      const cap = pn.querySelector('.c3-cap')
      rows.push({
        folio, tpl,
        w: Math.round(A.width), h: Math.round(A.height),
        ratio: +(A.width / A.height).toFixed(2),
        cover: Math.round((area / (A.width * A.height)) * 100),
        bleed, collide, boxes: boxes.length,
        size: cap ? Math.round(parseFloat(getComputedStyle(cap).fontSize) * 10) / 10 : 99,
      })
    })
  })
  const bk = document.querySelector('.c3-book').getBoundingClientRect()
  return { rows, pages,
    book: { w: Math.round(bk.width), h: Math.round(bk.height) },
    fillW: Math.round(bk.width / innerWidth * 100), fillH: Math.round(bk.height / innerHeight * 100) }
})

const { rows } = R
const tpl = {}
R.pages.forEach((t) => { tpl[t] = (tpl[t] ?? 0) + 1 })
console.log(`panels ${rows.length} on ${R.pages.length} pages ${JSON.stringify(tpl)} · ` +
  `book ${R.book.w}×${R.book.h} (${R.fillW}% of the window's width, ${R.fillH}% of its height)`)

const shapes = {}
rows.forEach((r) => { const k = `${r.w}×${r.h} (${r.ratio})`; shapes[k] = (shapes[k] ?? 0) + 1 })
console.log('panel shapes:', JSON.stringify(shapes))

/* a paired tier comes out 1.16, which keeps 87% of a 4:3 painting — that is
   the grid working, not art being thrown away. Below 1.1 it is a real loss. */
const squat = rows.filter((r) => r.ratio < 1.1)
const bleed = rows.filter((r) => r.bleed)
const hit = rows.filter((r) => r.collide)
const tiny = rows.filter((r) => r.size < 13)
const heavy = rows.filter((r) => r.cover > 22)
const cov = rows.map((r) => r.cover).sort((a, c) => a - c)

console.log(`panels squarer than 1.1 (art thrown away): ${squat.length}` +
  (squat.length ? ' → ' + squat.slice(0, 8).map((r) => `p.${r.folio}=${r.ratio}`).join(', ') : ''))
console.log(`lettering crossing its panel border:       ${bleed.length}` +
  (bleed.length ? ' → ' + bleed.map((r) => `p.${r.folio}`).join(', ') : ''))
console.log(`two boxes overlapping:                     ${hit.length}` +
  (hit.length ? ' → ' + hit.map((r) => `p.${r.folio}`).join(', ') : ''))
console.log(`caption text under 13px:                   ${tiny.length}`)
console.log(`lettering over the picture: median ${cov[cov.length >> 1]}% · ` +
  `max ${cov[cov.length - 1]}% · over 22%: ${heavy.length}` +
  (heavy.length ? ' → ' + heavy.slice(0, 8).map((r) => `p.${r.folio}=${r.cover}%`).join(', ') : ''))
console.log('console errors:', errs.length ? errs : 'none')
await b.close()
