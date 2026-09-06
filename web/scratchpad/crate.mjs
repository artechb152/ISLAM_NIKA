import { open } from './lib-probe.mjs'
const { browser, page } = await open('loading-road', { w: 800, h: 500 })
await page.waitForTimeout(3200)
const r = await page.evaluate(() => window.__ch1Audit)
console.log('crate sizes:', JSON.stringify(r.sizes.filter(s=>/crate/.test(s.name)).slice(0,5)))
console.log('camel sizes:', JSON.stringify(r.sizes.filter(s=>/camel/.test(s.name)).slice(0,3)))
// האם הגמלים זזים?
const p1 = await page.evaluate(() => window.__ch1Live.dynamic.map(d=>[+d.x.toFixed(2),+d.z.toFixed(2)]))
await page.waitForTimeout(3000)
const p2 = await page.evaluate(() => window.__ch1Live.dynamic.map(d=>[+d.x.toFixed(2),+d.z.toFixed(2)]))
console.log('dynamic colliders:', p1.length)
console.log('moved?', JSON.stringify(p1.slice(0,4)), '->', JSON.stringify(p2.slice(0,4)))
await browser.close()
