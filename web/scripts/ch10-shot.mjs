/* Chapter 10 — full-page screenshots at desktop and phone width, plus console errors and
   horizontal-overflow check. node scripts/ch10-shot.mjs <outdir> [path=/chapter10] */
import { chromium } from 'playwright-core'
const [dir, route = '/chapter10'] = process.argv.slice(2)
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME })
for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' })
  /* scroll through so reveals and scroll-lit steps fire, then back to the top */
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < H; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(60) }
  await page.evaluate(() => { document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-inview')); document.querySelectorAll('.ch10-steps li').forEach((n) => n.classList.add('is-on')) })
  await page.waitForTimeout(1500)
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  await page.screenshot({ path: `${dir}/${tag}.png`, fullPage: true })
  console.log(tag, 'height', H, 'overflowX', over, 'errors', errs.length, errs.slice(0, 4).join(' | '))
  await page.close()
}
await browser.close()
