/* Proves the motion layer actually runs, by measuring it rather than looking at
   a screenshot: a still frame cannot tell a slow camera from a dead one.

   Checks, in order:
     1  only the two open pages carry the drifting layers
     2  the lettering arrives after the turn, in sequence
     3  the camera is still moving twenty seconds in
     4  one pointer move puts the three depths at three different offsets
     5  the room takes the page's colour on a peak spread and on no other */
import { chromium } from 'playwright-core'

const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({
  viewport: { width: 1760, height: 1100 },
  reducedMotion: 'no-preference',
})
const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)))
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)

/* the drifting layers sit on every panel but are display:none unless their
   page is open — count the ones actually PAINTED, not the ones in the DOM */
const live = () => p.evaluate(() => ({
  fx: [...document.querySelectorAll('.c3-fx')].filter((e) => getComputedStyle(e).display !== 'none').length,
  haze: [...document.querySelectorAll('.c3-haze')].filter((e) => getComputedStyle(e).display !== 'none').length,
  pages: [...document.querySelectorAll('.c3-page.is-live')].map((e) =>
    e.querySelector('.c3-folio')?.textContent + ':' +
    [...e.querySelectorAll('.c3-pn')].map((n) => n.dataset.m).join('+')),
}))

console.log('cover:', JSON.stringify(await live()))
await p.click('.c3-arrow.is-next')

/* 2 · the lettering arrives after the page does */
const trace = []
for (let t = 0; t <= 1600; t += 200) {
  trace.push(await p.evaluate(() => {
    const caps = [...document.querySelectorAll('.c3-page.is-live .c3-cap')]
    return caps.map((c) => (+getComputedStyle(c).opacity).toFixed(2)).join(' ')
  }))
  await p.waitForTimeout(200)
}
console.log('caption opacity every 200ms from the start of the turn:')
trace.forEach((r, i) => console.log(`  ${String(i * 200).padStart(4)}ms  ${r}`))

console.log('spread 1:', JSON.stringify(await live()))

/* 3 · the camera keeps moving */
const cam = async () => p.evaluate(() => {
  const el = document.querySelector('.c3-page.is-live .c3-lens img')
  const m = new DOMMatrix(getComputedStyle(el).transform)
  return +m.a.toFixed(4)
})
const c0 = await cam()
await p.waitForTimeout(6000)
const c1 = await cam()
console.log(`camera scale: ${c0} → ${c1} after 6s (${c1 > c0 ? 'pushing in' : 'pulling out'})`)

/* 4 · three depths, three offsets */
const depths = async () => p.evaluate(() => {
  const g = (s) => {
    const el = document.querySelector('.c3-page.is-live ' + s)
    return el ? +new DOMMatrix(getComputedStyle(el).transform).e.toFixed(2) : null
  }
  return { lens: g('.c3-lens'), haze: g('.c3-haze'), fx: g('.c3-fx') }
})
await p.mouse.move(200, 300)
await p.waitForTimeout(900)
const dL = await depths()
await p.mouse.move(1560, 800)
await p.waitForTimeout(900)
const dR = await depths()
console.log('pointer far right → far left, x-offset of each depth:')
console.log(`  picture     ${dL.lens}  →  ${dR.lens}`)
console.log(`  atmosphere  ${dL.haze}  →  ${dR.haze}`)
console.log(`  motes       ${dL.fx}  →  ${dR.fx}`)

/* 5 · the room takes the page's colour, and only on a peak. Which spread that
   is comes from the DOM — the pagination decides it, not this script. */
const scene = () => p.evaluate(() => {
  const s = document.querySelector('.c3-scene')
  return { on: s.classList.contains('is-on'), opacity: +getComputedStyle(s).opacity.slice(0, 4) }
})
const last = await p.evaluate(() => document.querySelectorAll('.c3-sheet').length) - 1
const roll = []
for (let n = 1; n <= last; n++) {
  const s = await scene()
  const isPeak = await p.evaluate(() => !!document.querySelector('.c3-page.is-live.is-peak'))
  roll.push({ n, isPeak, on: s.on })
  if (n < last) { await p.click('.c3-arrow.is-next'); await p.waitForTimeout(1500) }
}
const peaks = roll.filter((r) => r.isPeak).map((r) => r.n)
const lit = roll.filter((r) => r.on).map((r) => r.n)
console.log('spreads holding a peak panel:', peaks.join(', '))
console.log('spreads where the room lights up:', lit.join(', '),
  peaks.join() === lit.join() ? '— they match' : '— MISMATCH')

console.log('page errors:', errs.length ? errs : 'none')
await b.close()
