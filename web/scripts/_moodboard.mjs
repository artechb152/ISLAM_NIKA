import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'

const ROOT = 'C:/Users/nikag/ISLAM_NIKA/concept/chapter3/moodboard/'
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewportSize: { width: 1180, height: 1000 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(ROOT + 'moodboard.html').href, { waitUntil: 'networkidle' })
await p.waitForTimeout(900)

await p.screenshot({ path: ROOT + 'moodboard.png', fullPage: true })
console.log('full page height', await p.evaluate(() => document.body.scrollHeight))

/* one crop per section, so each rule can be looked at on its own */
const boxes = await p.evaluate(() => {
  const hs = [...document.querySelectorAll('h2')]
  return hs.map((h, i) => {
    const y = h.getBoundingClientRect().top + window.scrollY
    const next = hs[i + 1] ? hs[i + 1].getBoundingClientRect().top + window.scrollY : y + 900
    return { y, h: Math.min(next - y - 16, 1500) }
  })
})
for (let i = 0; i < boxes.length; i++) {
  await p.screenshot({
    path: `${ROOT}sec-${i + 1}.png`,
    fullPage: true,
    clip: { x: 20, y: boxes[i].y - 26, width: 1140, height: Math.max(260, boxes[i].h) },
  })
}
console.log('sections shot:', boxes.length)
await b.close()
