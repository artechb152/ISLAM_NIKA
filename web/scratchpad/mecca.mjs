import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('mecca', { w: 1200, h: 750 })
const T = { x: -1.8 + 2.1, z: -12.6 + 1.3 }
await page.waitForFunction(() => window.__ch1TablePut, null, { timeout: 30000 })
await page.evaluate((t) => window.__ch1Live.player.set(-1.8 + 1.2, 0, -12.6 + 1.9), T)
await page.waitForTimeout(1800)
await page.screenshot({ path: 'scratchpad/shots/mecca-1-table.png' })
console.log('1. E before the table is set:')
await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
console.log('   panel:', await page.evaluate(() => !!document.querySelector('.ch1-task')),
            '| Rawi asks to set it:', await page.evaluate(() => /סדר את השולחן/.test(document.body.innerText)))
await page.screenshot({ path: 'scratchpad/shots/mecca-2-gated.png' })
console.log('2. placing the three pieces on the table:')
for (const i of [0,1,2]) { await page.evaluate((n) => window.__ch1TablePut(n), i); await page.waitForTimeout(700) }
await page.waitForTimeout(900)
await page.screenshot({ path: 'scratchpad/shots/mecca-3-placed.png' })
console.log('3. E once the table is set:')
await page.keyboard.press('KeyE'); await page.waitForTimeout(1400)
console.log('   panel:', await page.evaluate(() => !!document.querySelector('.ch1-task')))
await page.screenshot({ path: 'scratchpad/shots/mecca-4-summary.png' })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
