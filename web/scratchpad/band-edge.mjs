import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => {
  const band = document.querySelector('.ch4-band:not(.is-plain)')
  const art = document.querySelector('.chapter-article')
  const rail = document.querySelector('.chapter-drawer')
  const r = (e) => e ? [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().right)] : null
  return { band: r(band), article: r(art), rail: r(rail), overflow: document.documentElement.scrollWidth > innerWidth + 2 }
})))
const el = await page.$('.ch4-band:not(.is-plain)')
await el?.scrollIntoViewIfNeeded(); await page.waitForTimeout(2000)
await page.screenshot({ path: 'scratchpad/band-2.png' })
await b.close()
