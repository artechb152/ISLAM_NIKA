import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('night-camp')
const startRegion = await page.evaluate(() => document.querySelector('.hud-goal')?.innerText?.slice(0, 30) ?? '')
console.log('WebGL canvas:', await page.evaluate(() => !!document.querySelector('canvas')))
const trace = []
for (const z of [-5, -10, -12, -13, -13.2, -13.5, -14, -16, -18]) {
  await page.evaluate((zz) => window.__ch1Live.player.set(0, 0, zz), z)
  await page.waitForTimeout(500)
  const st = await page.evaluate(() => {
    const a = document.querySelector('.ch1-arrive')
    return {
      z: +window.__ch1Live.player.z.toFixed(2),
      transitioning: !!(a && !a.classList.contains('is-gone')),
      region: new URLSearchParams(location.search).get('region'),
    }
  })
  trace.push({ asked: z, ...st })
  if (st.transitioning) break
}
console.log(JSON.stringify(trace))
console.log('pageerrors:', errors.length ? errors : 'none')
await browser.close()
