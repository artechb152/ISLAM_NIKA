import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1100, height: 620 } })).newPage()
await page.addInitScript(() => {
  try {
    localStorage.setItem('ch1:intro:v1', '1')
    localStorage.setItem('ch1:arrived:loading-road:v1', '1')
  } catch {}
})
await page.goto('http://localhost:3000/chapter1?region=loading-road&from=resume', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForTimeout(5000)
for (let i = 0; i < 20; i++) {
  const open = await page.evaluate(() => !!document.querySelector('.hud-dialogue'))
  if (!open) break
  await page.keyboard.press('Space'); await page.waitForTimeout(300)
}
await page.screenshot({ path: 'scratchpad/game-idle.png' })
await page.keyboard.down('KeyW')
await page.waitForTimeout(1800)
await page.screenshot({ path: 'scratchpad/game-walk.png' })
await page.keyboard.down('ShiftLeft')
await page.waitForTimeout(1800)
await page.screenshot({ path: 'scratchpad/game-run.png' })
await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW')
await browser.close()
