import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
const bands = await page.$$('.ch4-band:not(.is-plain)')
for (let i = 0; i < bands.length; i++) {
  await bands[i].scrollIntoViewIfNeeded()
  await page.waitForTimeout(1800)
  await bands[i].screenshot({ path: `scratchpad/bandshot-${i + 1}.png` })
}
console.log('bands shot:', bands.length)
await b.close()
