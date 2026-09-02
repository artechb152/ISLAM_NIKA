import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(8000)
console.log(JSON.stringify(await page.evaluate(() => {
  const DEV = '.ch4-echo,.ch4-cards,.ch4-forces,.ch4-def,.ch4-rulings,.ch4-concessions,.ch4-film,.ch4-pair,.ch4-outcomes,.ch4-figure,.ch4-treaties,.ch4-journey,.ch4-two,.ch4-trench'
  const words = (el) => (el.innerText || '').trim().split(/\s+/).filter(Boolean).length
  let inDev = 0, plain = 0
  for (const p of document.querySelectorAll('.chapter-article p, .chapter-article li')) {
    if (p.closest(DEV)) inDev += words(p); else plain += words(p)
  }
  return {
    plainProse: plain,
    inMechanisms: inDev,
    share: Math.round((inDev / (inDev + plain)) * 100) + '%',
    devices: document.querySelectorAll(DEV).length,
    plates: document.querySelectorAll('.ch4-plate').length,
  }
}), null, 1))
await b.close()
