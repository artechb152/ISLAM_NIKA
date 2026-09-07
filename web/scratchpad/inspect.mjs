/* מצלם חפיפה מקרוב, משלוש זוויות, כדי שאפשר יהיה להכריע בעין. */
import { open } from './lib-probe.mjs'
import fs from 'node:fs'
const [region, xs, zs, tag] = process.argv.slice(2)
const x = +xs, z = +zs
const { browser, page } = await open(region, { w: 900, h: 560 })
fs.mkdirSync('scratchpad/shots/inspect', { recursive: true })
for (const [i, yaw] of [0, 2.1, 4.2].entries()) {
  await page.evaluate(({ x, z, yaw }) => {
    const L = window.__ch1Live
    L.player.x = x + Math.sin(yaw + Math.PI) * 7
    L.player.z = z + Math.cos(yaw + Math.PI) * 7
    L.yaw = yaw
    L.lastDrag = performance.now()
  }, { x, z, yaw })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `scratchpad/shots/inspect/${tag}-${i}.png` })
}
console.log('shot', tag)
await browser.close()
