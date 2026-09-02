import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1100 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(8000)
const el = await page.$('.ch4-trench')
if (!el) { console.log('NO TRENCH', errs); process.exit(1) }
await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(800)
console.log(JSON.stringify(await page.evaluate(() => ({
  labels: [...document.querySelectorAll('.ch4-trench-label')].map((n) => n.textContent),
}))))
await el.screenshot({ path: 'scratchpad/m-trench.png' })
console.log('errors:', errs.length ? errs : 'none')
await b.close()
