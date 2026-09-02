// מדידת מהירות כף רגל נטועה ב-timeScale=1 בעמוד האבחון, ב-Chrome אמיתי
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
await page.goto('http://localhost:3000/chapter1/dev-character?model=/assets/chapter1/models/player2.glb&raw=1', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__devWalk && window.__devWalk.samples.length > 5, null, { timeout: 30000 })
await page.evaluate(() => { window.__devWalk.samples.length = 0 })
await page.waitForTimeout(9000)
const r = await page.evaluate(() => {
  const s = window.__devWalk.samples
  const sorted = [...s].sort((a, b) => a - b)
  return { n: s.length, median: sorted[Math.floor(s.length / 2)] }
})
console.log(JSON.stringify(r))
await page.screenshot({ path: 'scratchpad/p2-front.png' })
await browser.close()
