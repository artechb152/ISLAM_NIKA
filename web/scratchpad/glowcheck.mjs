import { open } from './lib-probe.mjs'
import fs from 'node:fs'
const T = {
  'yemen-heights': [-7.4, 11.0], 'night-camp': [0, 0], 'border-post': [0, 0],
  'narrow-pass': [0, 0], 'loading-road': [0, 0], 'yathrib': [0, 0],
  'monastery': [-2.6, 3.8], 'mecca': [-1.8, -12.6],
}
const region = process.argv[2]
const dist = Number(process.argv[3] ?? 13)
const [tx, tz] = T[region]
const { browser, page } = await open(region)
await page.evaluate(({ tx, tz, dist }) => {
  const L = window.__ch1Live
  L.player.x = tx
  L.player.z = tz + dist
  L.yaw = 0
  L.lastDrag = performance.now()
}, { tx, tz, dist })
await page.waitForTimeout(2500)
fs.mkdirSync('scratchpad/shots/glow', { recursive: true })
await page.screenshot({ path: `scratchpad/shots/glow/${region}-task-${dist}.png` })
console.log('ok')
await browser.close()
