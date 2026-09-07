/* מאמת אחת-אחת את שש הטענות לפני שהן נכתבות בדוח. */
import { open } from './lib-probe.mjs'
const region = process.argv[2] || 'night-camp'
const { browser, page } = await open(region, { w: 800, h: 500 })
await page.waitForFunction(()=>window.__ch1Audit && window.__ch1Where, null, { timeout:120000 })
let prev=-1, same=0
for (let k=0;k<14 && same<3;k++){ const n=await page.evaluate(()=>window.__ch1Audit?.counted??0); same = n===prev?same+1:0; prev=n; await page.waitForTimeout(2600) }
const r = await page.evaluate(() => {
  const A = window.__ch1Audit, C = window.__ch1Statics
  const camels = A.sizes.filter(s => s.name.startsWith('camel:')).map(s => s.name)
  const torchCols = C.filter(c => Math.abs(c.r - 0.34) < 0.001)
  return {
    region: window.__ch1Where.region,
    camelNames: camels,
    counted: A.counted,
    unapproved: A.unapproved.length,
    torchColliders: torchCols.length,
    colliderCount: C.length,
  }
})
console.log(`== ${r.region}`)
console.log(`1. גמלים ב-DevAudit בשמות נפרדים: ${r.camelNames.length ? r.camelNames.join(', ') : 'אין!'}`)
console.log(`2. קוליידרים ברדיוס 0.34 (לפידים): ${r.torchColliders} מתוך ${r.colliderCount} קוליידרים`)
console.log(`   עצמים שנמדדו: ${r.counted} · לא מאושרות: ${r.unapproved}`)
await browser.close()
