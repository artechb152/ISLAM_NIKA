import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(7000)
await page.evaluate(() => document.querySelector('#groups')?.scrollIntoView())
await page.waitForTimeout(1200)
const c = await page.evaluate(() => {
  const g = (el) => el ? getComputedStyle(el).backgroundColor : null
  return {
    page: g(document.querySelector('.chapter-article')) || g(document.body),
    card: g(document.querySelector('.ch4-card')),
    forces: g(document.querySelector('.ch4-forces')),
    echo: g(document.querySelector('.ch4-echo')),
    ruling: g(document.querySelector('.ch4-ruling')),
    railItems: document.querySelectorAll('.chapter-rail a, nav ol > li').length,
  }
})
console.log(JSON.stringify(c, null, 1))
await page.screenshot({ path: 'scratchpad/ch4-cards.png' })
await b.close()
