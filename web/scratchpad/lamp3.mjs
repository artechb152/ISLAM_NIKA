import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yemen-heights', { w: 1200, h: 750 })
const T = { x: -7.4, z: 11.0 }
await page.waitForFunction(() => window.__ch1LampSet, null, { timeout: 30000 })
await page.evaluate((t) => { window.__ch1Live.player.set(t.x + 1.2, 0, t.z + 1.6) }, T)
await page.waitForTimeout(1200)

console.log('1. E while the stone is still in shadow:')
await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
console.log('   task panel open:', await page.evaluate(() => !!document.querySelector('.ch1-task')),
            '| Rawi note shown:', await page.evaluate(() => /האבן בצל/.test(document.body.innerText)))
await page.screenshot({ path: 'scratchpad/shots/yemen-1-shadow.png' })

console.log('2. dragging the lamp onto the stone and holding it there:')
await page.evaluate((t) => window.__ch1LampSet(t.x + 0.9, t.z + 0.5), T)
await page.waitForTimeout(2600)
await page.screenshot({ path: 'scratchpad/shots/yemen-2-lit.png' })

console.log('3. E once the carving is out of the shadow:')
await page.keyboard.press('KeyE'); await page.waitForTimeout(1300)
const open2 = await page.evaluate(() => !!document.querySelector('.ch1-task'))
console.log('   task panel open:', open2)
await page.screenshot({ path: 'scratchpad/shots/yemen-3-question.png' })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
