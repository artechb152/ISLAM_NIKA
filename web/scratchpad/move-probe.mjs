import { open } from './lib-probe.mjs'
const region = process.argv[2] || 'camp'
const { browser, page, errors } = await open(region)
const res = await page.evaluate(async () => {
  const L = window.__ch1Live
  const samples = []
  const start = performance.now()
  // press W via the real key path
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }))
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }))
  await new Promise((r) => {
    const tick = () => {
      samples.push({ t: performance.now() - start, x: L.player.x, z: L.player.z })
      if (performance.now() - start < 4000) requestAnimationFrame(tick)
      else r()
    }
    requestAnimationFrame(tick)
  })
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }))
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }))
  return samples
})
let back = 0, maxBack = 0, total = 0
for (let i = 1; i < res.length; i++) {
  const dx = res[i].x - res[i-1].x, dz = res[i].z - res[i-1].z
  const pdx = res[i-1].x - (res[i-2]?.x ?? res[i-1].x), pdz = res[i-1].z - (res[i-2]?.z ?? res[i-1].z)
  const dot = dx*pdx + dz*pdz
  const step = Math.hypot(dx, dz)
  total += step
  if (dot < 0 && step > 0.004) { back++; maxBack = Math.max(maxBack, step) }
}
console.log(`region=${region} frames=${res.length} travelled=${total.toFixed(2)}m reversals=${back} maxReversal=${maxBack.toFixed(3)}m`)
console.log('first/last:', JSON.stringify(res[0]), JSON.stringify(res[res.length-1]))
// print a compact trace of per-frame step sizes
const steps = res.slice(1).map((p,i)=>Math.hypot(p.x-res[i].x, p.z-res[i].z).toFixed(3))
console.log('steps:', steps.slice(0,60).join(' '))
if (errors.length) console.log('ERRORS', errors)
await browser.close()
