import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } })
for (const ch of ['chapter2', 'chapter6']) {
  const page = await ctx.newPage()
  await page.goto(`http://localhost:3000/${ch}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
  await page.waitForTimeout(8000)
  for (const f of [0.12, 0.3, 0.55]) {
    await page.evaluate((f) => scrollTo(0, document.body.scrollHeight * f), f)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `scratchpad/ref-${ch}-${Math.round(f * 100)}.png` })
  }
  await page.close()
}
console.log('done')
await b.close()
