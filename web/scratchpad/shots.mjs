import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(8000)
for (const [sel, name] of [['.ch4-pair', 'pair'], ['.ch4-film', 'film'], ['.ch4-outcomes', 'outcomes'], ['.ch4-treaties', 'treaties'], ['.ch4-figure', 'figure']]) {
  const el = await page.$(sel)
  if (!el) { console.log('missing', sel); continue }
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(700)
  await el.screenshot({ path: `scratchpad/m-${name}.png` })
}
console.log('done')
await b.close()
