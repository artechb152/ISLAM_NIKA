import { open } from './lib-probe.mjs'
const { browser, page } = await open('yathrib')
await page.evaluate(() => {
  const L = window.__ch1Live
  L.player.x = 1.4; L.player.z = 6.2 + 3.2; L.yaw = 0; L.lastDrag = performance.now()
})
await page.waitForTimeout(3000)
await page.screenshot({ path: 'scratchpad/shots/glow/yathrib-board.png' })
const a = await page.evaluate(() => window.__ch1Audit)
console.log('unapproved', a.unapproved.length, 'floating', JSON.stringify(a.floating))
await browser.close()
