import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('ERR:', m.text().slice(0, 200)) })
page.on('pageerror', (e) => console.log('PAGEERR:', e.message.slice(0, 300)))
page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(-60)) })
await page.goto('http://localhost:3000/chapter1/dev-character?model=/assets/chapter1/models/player2.glb&raw=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(12000)
const st = await page.evaluate(() => ({
  hasCanvas: !!document.querySelector('canvas'),
  buttons: [...document.querySelectorAll('button')].map((b) => b.textContent),
  devWalk: window.__devWalk ? window.__devWalk.samples.length : 'absent',
}))
console.log(JSON.stringify(st, null, 1))
await page.screenshot({ path: 'scratchpad/p2-dbg.png' })
await browser.close()
