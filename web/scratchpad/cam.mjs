import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yemen-heights', { w: 1100, h: 700 })
await page.waitForFunction(() => window.__ch1Cam, null, { timeout: 30000 })
// להצמיד את השחקן לקיר ולראות שהמצלמה לא נכנסת לתוכו
const probe = async (x, z, tag) => {
  await page.evaluate(([a,b]) => window.__ch1Live.player.set(a,0,b), [x,z])
  await page.waitForTimeout(1400)
  const r = await page.evaluate(() => {
    const cam = window.__ch1Cam, p = window.__ch1Live.player
    return { camY: +cam.position.y.toFixed(2), dist: +Math.hypot(cam.position.x-p.x, cam.position.z-p.z).toFixed(2) }
  })
  await page.screenshot({ path: `scratchpad/shots/cam-${tag}.png` })
  console.log(tag, JSON.stringify(r))
}
await probe(-2.2, 17.6, 'at-wall')
await probe(0, 6, 'open')
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
