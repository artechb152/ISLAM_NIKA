import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(10000)
console.log(JSON.stringify(await page.evaluate(() => ({
  bodies: document.querySelectorAll('.ch4-body').length,
  keys: document.querySelectorAll('b.key').length,
  sections: document.querySelectorAll('.article-section').length,
  firstBodyHTML: document.querySelector('.ch4-body')?.innerHTML?.slice(0, 140),
}))))
console.log('errors:', errs.length ? errs : 'none')
await b.close()
