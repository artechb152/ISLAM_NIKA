import { open } from './lib-probe.mjs'
const r = process.argv[2]
const { browser, page } = await open(r, { w: 800, h: 500 })
await page.waitForTimeout(3500)
const a = await page.evaluate(() => window.__ch1Audit)
console.log(r, 'overlaps>2%:', a.overlaps.length, 'offGround:', a.floating.length)
for (const f of a.floating.slice(0,6)) console.log('   ', f.name, f.gap>0?'floating':'sunk', Math.abs(f.gap)+'m')
await browser.close()
