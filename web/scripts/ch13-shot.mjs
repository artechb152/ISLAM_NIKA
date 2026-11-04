/* Chapter 13 — the hall: intro, the entrance view, a station up close with its prompt, the
   card open, mid-hall, and a short walk by keyboard (proves movement works, not only teleport).
   MSYS_NO_PATHCONV=1 node scripts/ch13-shot.mjs <outdir> [w=1440] [h=900] */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const [dir, w = '1440', h = '900'] = process.argv.slice(2)
mkdirSync(dir, { recursive: true })
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errs = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', (e) => errs.push(String(e)))
await page.goto('http://localhost:3000/chapter13', { waitUntil: 'load', timeout: 180000 })
await page.evaluate(() => localStorage.removeItem('ch13:v1'))
await page.reload({ waitUntil: 'load', timeout: 180000 })
await page.waitForSelector('.ch13-go', { timeout: 120000 })
await page.waitForTimeout(6000)
await page.screenshot({ path: `${dir}/0-intro.png` })
await page.click('.ch13-go')
await page.waitForTimeout(2500)
await page.screenshot({ path: `${dir}/1-entrance.png` })

const go = (x, z, yaw, pitch = 0) => page.evaluate(([x, z, yaw, pitch]) => window.__ch13Go(x, z, yaw, pitch), [x, z, yaw, pitch])
/* §1: in front of the flag, looking at it */
await go(1.6, -2.6, -1.05, 0.12)
await page.waitForTimeout(1200)
await page.screenshot({ path: `${dir}/2-station.png` })
console.log('prompt:', await page.locator('.ch13-prompt').textContent().catch(() => '—'))
await page.keyboard.press('KeyE')
await page.waitForTimeout(800)
await page.screenshot({ path: `${dir}/3-card.png` })
await page.keyboard.press('Escape')
/* mid-hall, looking at the left row */
await go(0.3, -17, 0.75, 0.02)
await page.waitForTimeout(1200)
await page.screenshot({ path: `${dir}/4-mid.png` })
/* walk: hold ↑ for 1.5 s from the entrance */
await go(0, 4.8, 0, 0)
await page.keyboard.down('ArrowUp')
await page.waitForTimeout(1500)
await page.keyboard.up('ArrowUp')
await page.waitForTimeout(400)
await page.screenshot({ path: `${dir}/5-walked.png` })
/* D turns (WASD = the arrows), and the mouse moves nothing */
await page.keyboard.down('KeyD')
await page.waitForTimeout(700)
await page.keyboard.up('KeyD')
await page.mouse.move(700, 450); await page.mouse.down(); await page.mouse.move(1100, 300, { steps: 10 }); await page.mouse.up()
await page.waitForTimeout(600)
await page.screenshot({ path: `${dir}/6-turned-D.png` })
console.log('count:', await page.locator('.ch13-count').textContent())
console.log(errs.length ? errs.join('\n') : 'no console errors')
await browser.close()
