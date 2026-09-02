import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(7000)
await page.evaluate(() => document.querySelector('#covenant')?.scrollIntoView())
await page.waitForTimeout(1200)
await page.screenshot({ path: 'scratchpad/ch4-prose.png' })
await b.close()
