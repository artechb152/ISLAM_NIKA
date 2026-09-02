import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 950 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(8000)
const btn = await page.$('.menu-collapse, [aria-label*="צמצם"], [aria-label*="כווץ"], .chapter-drawer button')
await page.evaluate(() => { try { localStorage.setItem('ch4:side-collapsed', '1') } catch {} })
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(8000)
const info = await page.evaluate(() => {
  const d = document.querySelector('.chapter-drawer')
  const subs = [...document.querySelectorAll('.menu-subs')]
  return {
    collapsed: d?.className.includes('is-collapsed'),
    railWidth: d ? Math.round(d.getBoundingClientRect().width) : null,
    subsVisible: subs.filter((s) => s.getBoundingClientRect().height > 0).length,
    totalSubs: subs.length,
  }
})
console.log(JSON.stringify(info))
const d = await page.$('.chapter-drawer')
await d?.screenshot({ path: 'scratchpad/rail-collapsed.png' })
await b.close()
