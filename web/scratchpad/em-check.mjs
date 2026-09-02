import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(8000)
console.log(JSON.stringify(await page.evaluate(() => ({
  keys: document.querySelectorAll('.chapter-article b.key').length,
  sample: [...document.querySelectorAll('.chapter-article b.key')].slice(0, 8).map((n) => n.textContent),
}))))
await page.evaluate(() => document.querySelector('#hijra')?.scrollIntoView())
await page.waitForTimeout(1200)
await page.evaluate(() => scrollBy(0, 700))
await page.waitForTimeout(900)
await page.screenshot({ path: 'scratchpad/ch4-emph.png' })
await b.close()
