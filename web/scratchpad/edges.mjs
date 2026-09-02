import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => {
  const st = document.querySelector('.ch4-stage.is-wide')
  const g = st.querySelector('.ch4-stage-grid:not([hidden])')
  const img = g.querySelector('.ch4-stage-plate img')
  const r = (e) => { const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.right)] }
  return { stage: r(st), grid: r(g), plate: r(g.querySelector('.ch4-stage-plate')), img: r(img), copy: r(g.querySelector('.ch4-stage-copy')) }
}), null, 1))
await b.close()
