import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yathrib', { w: 1200, h: 750 })
const T = { x: 1.4, z: 6.2 }
await page.waitForFunction(() => window.__ch1Scene, null, { timeout: 30000 })
await page.evaluate((t) => { window.__ch1Live.player.set(t.x + 1.0, 0, t.z + 1.9) }, T)
await page.waitForTimeout(1800)
const names = await page.evaluate(() => {
  const out = []
  window.__ch1Scene.traverse(o => { if (/^(prop|task):/.test(o.name||'')) out.push(o.name) })
  return out.filter(n => /basket|writing|codex|censer|scroll/.test(n))
})
console.log('task objects in world:', JSON.stringify(names))
console.log('atTask:', await page.evaluate(() => !!window.__ch1Live.atTask))
await page.screenshot({ path: 'scratchpad/shots/yathrib-physical.png' })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
