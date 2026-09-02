import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } })
const ch = process.argv[2]
const page = await ctx.newPage()
await page.goto(`http://localhost:3000/${ch}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
const H = await page.evaluate(() => document.body.scrollHeight)
const steps = Number(process.argv[3] || 9)
for (let i = 0; i < steps; i++) {
  const y = Math.round((H - 950) * (i / (steps - 1)))
  await page.evaluate((y) => scrollTo(0, y), y)
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `scratchpad/walk-${ch}-${String(i).padStart(2, '0')}.png` })
}
console.log(ch, 'height', H, 'shots', steps)
await b.close()
