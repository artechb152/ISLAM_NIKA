import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => {
  const st = document.querySelector('.ch4-stage.is-wide')
  const sec = st?.closest('.article-section')
  const img = st?.querySelector('.ch4-stage-plate img')
  return {
    stage: Math.round(st?.getBoundingClientRect().width ?? 0),
    section: Math.round(sec?.getBoundingClientRect().width ?? 0),
    imgRight: Math.round(img?.getBoundingClientRect().right ?? 0),
    viewport: innerWidth,
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 2,
  }
})))
await b.close()
