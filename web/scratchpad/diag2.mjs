import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)) })
page.on('requestfailed', (r) => errs.push('REQFAIL ' + r.url().split('/').pop() + ' ' + r.failure()?.errorText))
const res = await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
console.log('status', res?.status())
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => ({
  sections: document.querySelectorAll('.article-section').length,
  bodyText: (document.body.innerText || '').slice(0, 120).replace(/\n/g, ' | '),
  hasArticle: !!document.querySelector('.chapter-article'),
  overflowX: document.documentElement.scrollWidth > innerWidth + 2,
  height: document.body.scrollHeight,
}))))
console.log('ERRORS:', errs.length ? errs.slice(0, 8) : 'none')
await page.screenshot({ path: 'scratchpad/broken-top.png' })
await page.evaluate(() => scrollTo(0, document.body.scrollHeight * 0.5))
await page.waitForTimeout(1200)
await page.screenshot({ path: 'scratchpad/broken-mid.png' })
await b.close()
