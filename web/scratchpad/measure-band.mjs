import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
console.log(JSON.stringify(await page.evaluate(() => {
  const r = (e) => e ? { l: Math.round(e.getBoundingClientRect().left), w: Math.round(e.getBoundingClientRect().width) } : null
  const art = document.querySelector('.chapter-article')
  const cs = art ? getComputedStyle(art) : null
  const bands = [...document.querySelectorAll('.ch4-band:not(.is-plain)')].map((bd) => ({
    band: r(bd),
    copy: r(bd.querySelector('.ch4-band-copy')),
    flip: bd.className.includes('is-flip'),
  }))
  return {
    content: r(document.querySelector('.chapter-content')),
    layout: r(document.querySelector('.chapter-layout')),
    article: r(art),
    artPad: cs ? [cs.paddingLeft, cs.paddingRight] : null,
    rail: r(document.querySelector('.chapter-drawer')),
    bands,
  }
}), null, 1))
await b.close()
