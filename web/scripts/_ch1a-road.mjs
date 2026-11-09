/* Chapter 1 article pilot — the road. Scroll through the map stage and capture the
   viewport at each beat, at desktop and phone width.
   MSYS_NO_PATHCONV=1 node scripts/_ch1a-road.mjs <outdir> */
import { chromium } from 'playwright-core'
const [dir] = process.argv.slice(2)
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME })
const errs = []
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.goto('http://localhost:3000/chapter1-article', { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForSelector('.ch1-route', { timeout: 90000 }); await page.waitForTimeout(1500)
  const top = await page.evaluate(() => document.querySelector('.ch1-route')?.getBoundingClientRect().top + window.scrollY)
  const span = await page.evaluate(() => document.querySelector('.ch1-route')?.getBoundingClientRect().height)
  console.log(tag, 'route block', Math.round(top), 'height', Math.round(span))
  const beats = [0.08, 0.3, 0.45, 0.6, 0.75, 0.9]
  for (const [i, f] of beats.entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), top + span * f - h * 0.3)
    await page.waitForTimeout(900)
    const s = await page.evaluate(() => {
      const c = document.querySelector('.ch1-caravan')
      return { caravan: c?.getAttribute('style'), goods: !!document.querySelector('.ch1-caravan-goods.is-on'), empires: document.querySelectorAll('.ch1-empire.is-on').length }
    })
    console.log(tag, i, JSON.stringify(s))
    await page.screenshot({ path: `${dir}/road-${tag}${i}.png` })
  }
  await page.close()
}
console.log('errors', errs.length, errs.slice(0, 3).join(' | '))
await browser.close()
