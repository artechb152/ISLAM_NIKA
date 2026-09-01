import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
await page.goto('http://localhost:3000/chapter1/dev-character?model=/assets/chapter1/models/player2.glb&raw=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(8000)
const st = await page.evaluate(() => window.__devDbg ?? 'no dbg')
console.log(JSON.stringify(st))
await browser.close()
