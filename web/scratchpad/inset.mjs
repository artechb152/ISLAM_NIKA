import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => {
  const st = document.querySelector('.ch4-stage.is-inset')
  const g = st?.querySelector('.ch4-stage-grid:not([hidden])')
  const box = (e) => e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), top: Math.round(e.getBoundingClientRect().top) } : null
  return {
    grids: st?.querySelectorAll('.ch4-stage-grid').length,
    visible: st?.querySelectorAll('.ch4-stage-grid:not([hidden])').length,
    stage: box(st), grid: box(g),
    plate: box(g?.querySelector('.ch4-stage-plate')),
    copy: box(g?.querySelector('.ch4-stage-copy')),
    lead: g?.querySelector('.ch4-stage-lead')?.textContent?.slice(0, 40),
    rail: box(st?.querySelector('.ch4-stage-rail')),
  }
}), null, 1))
await b.close()
