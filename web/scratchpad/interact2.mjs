import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yemen-heights', { w: 1400, h: 850 })
const at = async (x, z) => { await page.evaluate(([a,b]) => window.__ch1Live.player.set(a,0,b), [x,z]); await page.waitForTimeout(900) }
const st = () => page.evaluate(() => ({
  nearFind: window.__ch1Live.nearFind ?? null,
  atTask: !!window.__ch1Live.atTask,
  nearWho: window.__ch1Live.nearWho ?? null,
  find: !!document.querySelector('.ch1-find'), task: !!document.querySelector('.ch1-task'),
}))
await at(-9.4, 12.6)
console.log('standing on inscription:', JSON.stringify(await st()))
await page.keyboard.press('KeyE'); await page.waitForTimeout(1200)
console.log('after E:', JSON.stringify(await st()))
await browser.close()
console.log('errors:', errors.length ? errors : 'none')
