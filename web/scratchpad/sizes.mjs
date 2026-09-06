import { open } from './lib-probe.mjs'
const { browser, page } = await open('narrow-pass', { w: 900, h: 600 })
await page.waitForTimeout(3500)
const r = await page.evaluate(() => window.__ch1Audit)
const big = r.sizes.filter(s => s.w > 6 || s.d > 6).sort((a,b)=>b.w-a.w)
console.log('objects with a footprint over 6m:', JSON.stringify(big.slice(0,10), null, 1))
console.log('waymark/basalt sizes:', JSON.stringify(r.sizes.filter(s=>/waymark|basalt2/.test(s.name)).slice(0,6)))
await browser.close()
