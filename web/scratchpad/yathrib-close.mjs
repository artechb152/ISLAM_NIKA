import { open } from './lib-probe.mjs'
const { browser, page } = await open('yathrib')
await page.evaluate(() => {
  const L = window.__ch1Live
  L.player.x = 1.4; L.player.z = 6.2 + 2.6; L.yaw = 0; L.lastDrag = performance.now()
})
await page.waitForTimeout(4000)
await page.screenshot({ path: 'scratchpad/shots/glow/yathrib-close.png' })
const a = await page.evaluate(() => window.__ch1Audit)
console.log('unapproved', a.unapproved.length, JSON.stringify(a.unapproved))
const t = await page.evaluate(() => window.__ch1Task)
console.log('task hooks:', JSON.stringify(t && { props: t.props, bins: t.bins }))
await browser.close()
