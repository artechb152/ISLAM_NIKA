import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => ({
  bands: document.querySelectorAll('.ch4-band').length,
  plain: document.querySelectorAll('.ch4-band.is-plain').length,
  flip: document.querySelectorAll('.ch4-band.is-flip').length,
  overflow: document.documentElement.scrollWidth > innerWidth + 2,
}))))
const el = await page.$('.ch4-band:not(.is-plain)')
await el?.scrollIntoViewIfNeeded(); await page.waitForTimeout(2000)
await page.screenshot({ path: 'scratchpad/band-1.png' })
console.log('errors:', errs.length ? errs : 'none')
await b.close()
