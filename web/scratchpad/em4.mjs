import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(8000)
console.log(JSON.stringify(await page.evaluate(() => {
  const p = [...document.querySelectorAll('.ch4-body')].find((n) => n.querySelector('b.key'))
  if (!p) return { found: false }
  const cs = getComputedStyle(p)
  return {
    display: cs.display, gap: cs.gap,
    html: p.innerHTML.slice(0, 260),
    childNodes: [...p.childNodes].map((n) => n.nodeType === 3 ? 'TEXT' : n.nodeName),
    height: Math.round(p.getBoundingClientRect().height),
  }
}), null, 1))
await b.close()
