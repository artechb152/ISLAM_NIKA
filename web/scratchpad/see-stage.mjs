import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => ({
  stages: document.querySelectorAll('.ch4-stage').length,
  bleed: document.querySelectorAll('.ch4-stage.is-bleed').length,
  inset: document.querySelectorAll('.ch4-stage.is-inset').length,
  beats: [...document.querySelectorAll('.ch4-stage')].map((s) => s.querySelectorAll('.ch4-stage-line').length),
  allTextPresent: [...document.querySelectorAll('.ch4-stage-line')].every((n) => n.textContent.trim().length > 10),
}))))
const st = await page.$('.ch4-stage.is-bleed')
await st?.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
await st?.screenshot({ path: 'scratchpad/stage-bleed.png' })
/* advance two beats and shoot again */
const dots = await page.$$('.ch4-stage.is-bleed .ch4-stage-dot')
await dots[2]?.click(); await page.waitForTimeout(1200)
await st?.screenshot({ path: 'scratchpad/stage-bleed-3.png' })
const ins = await page.$('.ch4-stage.is-inset')
await ins?.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
await ins?.screenshot({ path: 'scratchpad/stage-inset.png' })
console.log('errors:', errs.length ? errs : 'none')
await b.close()
