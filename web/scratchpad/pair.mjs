import { open } from './lib-probe.mjs'
const { browser, page } = await open('narrow-pass', { w: 900, h: 600 })
await page.waitForTimeout(3500)
const r = await page.evaluate(() => window.__ch1Audit)
for (const n of ['waymark.glb@-6.2,26.6','basalt2.glb@-14.2,39.6']) {
  console.log(n, JSON.stringify(r.sizes.find(s => s.name.includes(n)) ?? 'NOT IN SIZES'))
}
console.log('total sizes entries:', r.sizes.length, 'counted:', r.counted)
console.log('names sample:', r.sizes.slice(0,3).map(s=>s.name))
console.log('duplicate names?', r.sizes.length - new Set(r.sizes.map(s=>s.name)).size)
await browser.close()
