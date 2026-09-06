import { open } from './lib-probe.mjs'
const { browser, page } = await open('narrow-pass', { w: 900, h: 600 })
await page.waitForTimeout(3500)
console.log(JSON.stringify(await page.evaluate(() => {
  const s = window.__ch1Scene
  const out = []
  s.updateMatrixWorld(true)
  s.traverse((o) => {
    if (!/^prop:(waymark|basalt2)/.test(o.name || '')) return
    const b = new (window.THREE?.Box3 ?? Object)(); // may not exist
    out.push({ name: o.name, pos: [+o.position.x.toFixed(1), +o.position.z.toFixed(1)] })
  })
  return out.slice(0, 8)
}), null, 1))
await browser.close()
