import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter3', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(8000)
console.log(JSON.stringify(await page.evaluate(() => {
  const p = [...document.querySelectorAll('.ch3-body')].find((n) => n.querySelector('b.key'))
  if (!p) return { found: false }
  const cs = getComputedStyle(p)
  const b = p.querySelector('b.key')
  return {
    found: true, display: cs.display, gap: cs.gap,
    paraHeight: Math.round(p.getBoundingClientRect().height),
    lineHeight: cs.lineHeight,
    bWidth: Math.round(b.getBoundingClientRect().width),
    bIsOwnLine: b.getBoundingClientRect().width > p.getBoundingClientRect().width * 0.9,
  }
})))
await b.close()
