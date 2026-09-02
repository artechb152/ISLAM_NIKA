import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => {
  const pos = (sel) => [...document.querySelectorAll(sel)].map((n) => ({
    t: n.textContent.trim().slice(0, 18),
    left: Math.round(n.getBoundingClientRect().left),
  }))
  const arrows = [...document.querySelectorAll('.ch4-stage.is-wide .ch4-stage-arrow')].map((n) => ({
    label: n.getAttribute('aria-label'),
    left: Math.round(n.getBoundingClientRect().left),
    path: n.querySelector('path')?.getAttribute('d'),
  }))
  return {
    beatDots: pos('.ch4-stage.is-wide .ch4-stage-dot'),
    arrows,
    groupCards: pos('.ch4-cards .ch4-card-name, .ch4-cards .ch4-card'),
    rulings: pos('.ch4-ruling-name'),
    treaties: pos('.ch4-treaties li'),
  }
}), null, 1))
await b.close()
