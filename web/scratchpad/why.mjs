/* מה בדיוק מאושר עכשיו, ולפי איזה כלל — לפני שמצמצמים אותם. */
import { open } from './lib-probe.mjs'
const counts = new Map()
for (const r of process.argv.slice(2)) {
  const { browser, page } = await open(r, { w: 700, h: 440 })
  await page.waitForFunction(()=>window.__ch1Audit, null, { timeout: 120000 }).catch(()=>{})
  let prev=-1
  for (let k=0;k<8;k++){ const n=await page.evaluate(()=>window.__ch1Audit?.counted??0); if(n===prev) break; prev=n; await page.waitForTimeout(2600) }
  const a = await page.evaluate(()=>window.__ch1Audit)
  for (const h of a.overlaps) {
    const key = h.why ?? '(UNAPPROVED)'
    if (!counts.has(key)) counts.set(key, [])
    counts.get(key).push(`${r}: ${h.a} ↔ ${h.b} ${h.depth}m ${Math.round(h.frac*100)}%`)
  }
  await browser.close()
}
for (const [why, list] of [...counts].sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`\n[${list.length}] ${why}`)
  for (const l of list.slice(0,4)) console.log('   ', l)
  if (list.length>4) console.log(`    … ועוד ${list.length-4}`)
}
