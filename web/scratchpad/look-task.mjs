import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page } = await open(region)
// aim the camera at the task station and step back a little
const info = await page.evaluate(async () => {
  const L = window.__ch1Live
  const T = window.__ch1TaskPos
  return { player: { x: L.player.x, z: L.player.z }, task: T ?? null }
})
console.log(JSON.stringify(info))
// scan yaw for the best framing
for (const yaw of [0, 1.2, 2.4, 3.6, 4.8]) {
  await page.evaluate((y) => { window.__ch1Live.yaw = y; window.__ch1Live.lastDrag = performance.now() }, yaw)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `scratchpad/shots/glow/${region}-${yaw}.png` })
}
await browser.close()
