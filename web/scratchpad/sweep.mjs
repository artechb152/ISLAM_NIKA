/* סקירה חזותית: כל תחנה משלוש זוויות, מנקודת הכניסה ומן התחנה עצמה. */
import { open } from './lib-probe.mjs'
import fs from 'node:fs'
const tag = process.argv[2] || 'after'
const regions = process.argv.slice(3)
const dir = `scratchpad/shots/sweep-${tag}`
fs.mkdirSync(dir, { recursive: true })
for (const r of regions) {
  try {
    const { browser, page, errors } = await open(r, { w: 1100, h: 620 })
    await page.waitForFunction(()=>window.__ch1Where, null, { timeout: 120000 }).catch(()=>{})
    await page.waitForTimeout(5000)
    const w = await page.evaluate(()=>window.__ch1Where)
    // א. נקודת הכניסה, שלוש זוויות
    for (const [i, yaw] of [0, 2.09, 4.19].entries()) {
      await page.evaluate((y)=>{ window.__ch1Live.yaw = y; window.__ch1Live.lastDrag = performance.now() }, yaw)
      await page.waitForTimeout(1600)
      await page.screenshot({ path: `${dir}/${r}-spawn-${i}.png` })
    }
    // ב. התחנה עצמה, שלוש זוויות
    if (w?.task) {
      for (const [i, yaw] of [0, 2.09, 4.19].entries()) {
        await page.evaluate(({t,y})=>{ const L=window.__ch1Live
          L.player.x = t.x + Math.sin(y+Math.PI)*4.5; L.player.z = t.z + Math.cos(y+Math.PI)*4.5
          L.yaw = y; L.lastDrag = performance.now() }, { t: w.task, y: yaw })
        await page.waitForTimeout(1800)
        await page.screenshot({ path: `${dir}/${r}-task-${i}.png` })
      }
    }
    console.log(`${r}: ok${errors.length ? ' · JS ' + errors.length : ''}`)
    await browser.close()
  } catch (e) { console.log(`${r}: FAIL ${String(e).slice(0,90)}`) }
}
