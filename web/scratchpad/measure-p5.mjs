import { chromium } from 'playwright-core'
const clip = process.argv[2] ?? 'walk'
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage()
await page.goto('http://localhost:3000/chapter1/dev-character?model=%2Fassets%2Fchapter1%2Fmodels%2Fplayer5.glb&raw=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
await page.click(`text="${clip}"`)
await page.waitForTimeout(2500)
await page.evaluate(() => { window.__devWalk.samples.length = 0 })
await page.waitForTimeout(8000)
const r = await page.evaluate(() => {
  const s = window.__devWalk.samples
  const sorted = [...s].sort((a, b) => a - b)
  return { n: s.length, median: +(sorted[Math.floor(s.length / 2)] ?? 0).toFixed(3) }
})
console.log(clip, JSON.stringify(r))
await page.screenshot({ path: `scratchpad/committee-r0/p5-${clip}.png` })
await browser.close()
