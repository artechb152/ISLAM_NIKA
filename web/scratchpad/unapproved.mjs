import { open } from './lib-probe.mjs'
const R = process.argv.slice(2)
let total = 0
for (const r of R) {
  const { browser, page } = await open(r, { w: 800, h: 500 })
  await page.waitForTimeout(3500)
  const a = await page.evaluate(() => window.__ch1Audit)
  total += a.unapproved.length
  console.log(`${r.padEnd(15)} contacts=${String(a.overlaps.length).padStart(3)}  UNAPPROVED=${a.unapproved.length}  offGround=${a.floating.length}`)
  for (const h of a.unapproved.slice(0, 8)) console.log(`    ${h.a} ↔ ${h.b}  ${h.depth}m ${Math.round(h.frac*100)}%`)
  await browser.close()
}
console.log('TOTAL UNAPPROVED:', total)
