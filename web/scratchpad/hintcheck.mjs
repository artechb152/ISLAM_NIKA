import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yathrib', { w: 1400, h: 850 })
console.log('hint before wait:', await page.evaluate(() => !!document.querySelector('.hud-hint')))
await page.waitForTimeout(27000)
const r = await page.evaluate(() => ({
  shown: !!document.querySelector('.hud-hint'),
  text: document.querySelector('.hud-hint')?.innerText?.trim(),
  role: document.querySelector('.hud-hint')?.getAttribute('role'),
}))
console.log('after 27s:', JSON.stringify(r))
await page.screenshot({ path: 'scratchpad/survey/hint.png' })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
