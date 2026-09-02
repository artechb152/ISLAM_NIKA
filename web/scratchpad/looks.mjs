import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
const res = await page.goto('http://localhost:3000/chapter4/looks', { waitUntil: 'domcontentloaded', timeout: 180000 })
console.log('status', res?.status())
await page.waitForTimeout(9000)
const tabs = await page.$$('.lk-tabs button')
console.log('tabs', tabs.length)
for (let i = 0; i < tabs.length; i++) {
  await tabs[i].click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `scratchpad/look-${i + 1}.png`, fullPage: false })
}
console.log('errors:', errs.length ? errs : 'none')
await b.close()
