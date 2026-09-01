import { chromium } from 'playwright-core'
import { pathToFileURL } from 'url'
import path from 'path'
const file = path.resolve(process.argv[2])
const times = (process.argv[3] ?? '0.5,4,7,10.5').split(',').map(Number)
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--allow-file-access-from-files'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.goto(pathToFileURL(file).href)
const v = page.locator('video')
await v.waitFor()
for (const t of times) {
  await page.evaluate((tt) => { const vid = document.querySelector('video'); vid.pause(); vid.currentTime = tt }, t)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `frame-${t}.png` })
}
await browser.close()
console.log('frames done')
