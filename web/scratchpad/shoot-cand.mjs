// צילומי שיפוט: מועמד מול NPC, קלוז-אפ ומרחק, באותו עמוד אבחון
import { chromium } from 'playwright-core'
const model = process.argv[2]
const tag = process.argv[3]
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage()
await page.goto(`http://localhost:3000/chapter1/dev-character?model=${model}&raw=1`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
await page.screenshot({ path: `scratchpad/committee-r0/cand-${tag}-near.png` })
await page.click('text=far').catch(() => {})
await page.waitForTimeout(2000)
await page.screenshot({ path: `scratchpad/committee-r0/cand-${tag}-far.png` })
await browser.close()
console.log('shot', tag)
