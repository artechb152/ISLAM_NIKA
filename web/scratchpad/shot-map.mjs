import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1100 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(7000)
const f = await page.$('.ch4-journey')
await f?.scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
console.log(JSON.stringify(await page.evaluate(() => {
  const names = [...document.querySelectorAll('.ch4-journey-name')].map((n) => ({ t: n.textContent, top: Math.round(n.getBoundingClientRect().top) }))
  const rects = names.map((n) => n.top)
  const minGap = Math.min(...rects.slice(1).map((v, i) => v - rects[i]))
  return { names, minGap, maps: document.querySelectorAll('.ch4-journey').length }
})))
await f?.screenshot({ path: 'scratchpad/ch4-map.png' })
await b.close()
