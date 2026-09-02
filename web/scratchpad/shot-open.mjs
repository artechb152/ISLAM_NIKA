import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
await page.screenshot({ path: 'scratchpad/open-1.png' })
await page.evaluate(() => scrollBy(0, 900))
await page.waitForTimeout(1400)
await page.screenshot({ path: 'scratchpad/open-2.png' })
const st = await page.$('.ch4-stage')
await st?.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500)
await st?.screenshot({ path: 'scratchpad/open-stage.png' })
console.log(JSON.stringify(await page.evaluate(() => ({
  stages: document.querySelectorAll('.ch4-stage').length,
  wide: document.querySelectorAll('.ch4-stage.is-wide').length,
  firstDevice: document.querySelector('.article-section')?.querySelector('.ch4-stage,.ch4-cards,.ch4-plate')?.className,
}))))
await b.close()
