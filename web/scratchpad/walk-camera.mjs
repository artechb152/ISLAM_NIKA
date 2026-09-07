/* סעיף 3: האם המצלמה יכולה להיכנס לסלע בהליכה רגילה?
   הולך את היקף האזור ואל תוך אשכולות הסלעים בכוח, ומודד בכל פריים
   את מרחק המצלמה מכל קוליידר. אין טלפורט — רק W/A/S/D. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page } = await open(region, { w: 800, h: 500 })
await page.waitForFunction(()=>window.__ch1Live && window.__ch1Cam, null, { timeout: 120000 })
await page.waitForTimeout(4000)
const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k) }
let worst = { depth: -99 }
const sample = async () => {
  const r = await page.evaluate(() => {
    const C = window.__ch1Cam, S = window.__ch1Statics
    if (!C || !S) return null
    let worst = { depth: -99 }
    for (const c of S) {
      const d = Math.hypot(C.position.x - c.x, C.position.z - c.z)
      const depth = c.r - d
      if (depth > worst.depth) worst = { depth: +depth.toFixed(2), r: c.r, dist: +d.toFixed(2), x: c.x, z: c.z }
    }
    return { worst, cam: [+C.position.x.toFixed(1), +C.position.z.toFixed(1)], p: [+window.__ch1Live.player.x.toFixed(1), +window.__ch1Live.player.z.toFixed(1)] }
  })
  if (r && r.worst.depth > worst.depth) worst = { ...r.worst, cam: r.cam, p: r.p }
}
/* מסלול: קדימה, פנייה, קדימה — עשרים קטעים שמכסים את האזור */
for (let i = 0; i < 20; i++) {
  await hold(['KeyW'], 2200); await sample()
  await hold(['ShiftLeft','KeyW'], 1600); await sample()
  await page.evaluate((y) => { window.__ch1Live.yaw = y; window.__ch1Live.lastDrag = performance.now() }, (i * 0.9) % 6.283)
  await page.waitForTimeout(500); await sample()
  await hold(['KeyW'], 1800); await sample()
}
console.log(`${region}: המצלמה הכי עמוק בתוך קוליידר: ${worst.depth} מ' (רדיוס ${worst.r}, מרחק ${worst.dist})`)
console.log(`   מצלמה ב-${JSON.stringify(worst.cam)}  שחקן ב-${JSON.stringify(worst.p)}`)
console.log(worst.depth > 0 ? '   ✗ המצלמה נכנסת לקוליידר בהליכה רגילה' : '   ✓ המצלמה נשארת מחוץ לכל קוליידר')
await browser.close()
