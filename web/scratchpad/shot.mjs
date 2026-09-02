import { chromium } from 'playwright-core'
const url = process.argv[2]
const out = process.argv[3]
const wait = +(process.argv[4] ?? 6000)
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(wait)
await page.screenshot({ path: out })
await browser.close()
