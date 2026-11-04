/* Chapter 13 — frames per second while walking, in a visible default Chrome (the user's setup).
   node scripts/ch13-fps.mjs [w=1440] [h=900] */
import { chromium } from 'playwright-core'
const [w = '1440', h = '900'] = process.argv.slice(2)
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME, headless: false })
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.argv[4] ?? 1) })
await page.goto('http://localhost:3000/chapter13', { waitUntil: 'load', timeout: 180000 })
await page.waitForSelector('.ch13-go', { timeout: 120000 })
await page.waitForTimeout(5000)
await page.click('.ch13-go')
await page.waitForTimeout(3000)
const sample = () => page.evaluate(() => new Promise((res) => {
  const t = []; let last = performance.now()
  const f = (now) => { t.push(now - last); last = now; if (t.length < 180) requestAnimationFrame(f); else res(t) }
  requestAnimationFrame(f)
}))
await page.keyboard.down('ArrowUp')
const t = await sample()
await page.keyboard.up('ArrowUp')
t.shift()
const avg = t.reduce((a, b) => a + b, 0) / t.length
const sorted = [...t].sort((a, b) => a - b)
console.log(`avg ${avg.toFixed(1)}ms (${(1000 / avg).toFixed(0)} fps) · p95 ${sorted[Math.floor(t.length * 0.95)].toFixed(1)}ms · worst ${sorted.at(-1).toFixed(1)}ms`)
console.log('draw calls:', await page.evaluate(() => window.__ch13Info?.()))
await browser.close()
