/* Screenshots chosen spreads of the live comic.
   `node scripts/_c3shot.mjs 0 1 8 18` → the cover, then after 1, 8, 18 turns. */
import { chromium } from 'playwright-core'
const want = process.argv.slice(2).map(Number)
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({
  viewport: { width: 1760, height: 1100 },
  reducedMotion: 'no-preference',
})
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const R = 'C:/Users/nikag/ISLAM_NIKA/concept/chapter3/shots/'
let at = 0
for (const n of want) {
  while (at < n) { await p.click('.c3-arrow.is-next'); at++; await p.waitForTimeout(950) }
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${R}s${String(n).padStart(2, '0')}.png` })
  console.log('shot', n)
}
await b.close()
