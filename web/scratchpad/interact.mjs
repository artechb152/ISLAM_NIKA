import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yemen-heights', { w: 1400, h: 850 })
const at = async (x, z) => { await page.evaluate(([a,b]) => window.__ch1Live.player.set(a,0,b), [x,z]); await page.waitForTimeout(900) }
const state = () => page.evaluate(() => ({
  nearFind: window.__ch1Live.nearFind ?? null,
  findCard: !!document.querySelector('.ch1-find'),
  keys: [...document.querySelectorAll('.hud-keys span')].map(s=>s.innerText.replace(/\s+/g,' ').trim()),
}))
console.log('keys panel:', JSON.stringify((await state()).keys))
await at(-9.4, 12.6)
console.log('near inscription:', JSON.stringify(await state()))
await page.keyboard.press('KeyE'); await page.waitForTimeout(1200)
const afterE = await state()
console.log('after E ->', JSON.stringify({ findCard: afterE.findCard }))
// לסגור ולנסות F על הממצא השני
await page.keyboard.press('Escape'); await page.waitForTimeout(600)
await at(7.8, -6.4)
await page.keyboard.press('KeyF'); await page.waitForTimeout(1200)
console.log('after F on second find ->', JSON.stringify({ findCard: (await state()).findCard }))
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
