import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
await page.goto('http://localhost:3000/chapter1/dev-character?model=/assets/chapter1/models/player2.glb&raw=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
await page.click('text=far')
await page.waitForTimeout(2500)
await page.screenshot({ path: 'scratchpad/p2-far.png' })
await browser.close()
