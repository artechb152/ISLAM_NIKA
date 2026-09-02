import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 400)))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type().toUpperCase() + ': ' + m.text().slice(0, 400)) })
page.on('requestfailed', (r) => errs.push('REQFAIL: ' + r.url().split('/').pop() + ' ' + r.failure()?.errorText))
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(10000)
await page.evaluate(() => scrollTo(0, document.body.scrollHeight * 0.4))
await page.waitForTimeout(3000)
console.log(errs.length ? errs.join('\n---\n') : 'no errors captured')
await b.close()
