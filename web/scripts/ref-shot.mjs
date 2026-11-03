/* עמודי העזר — צילום של כל אחד מארבעת העמודים, גלילה אחת פנימה, החיפוש במילון,
   הגדלת מפה, ותפריט מסך הפרקים. גם שגיאות קונסולה, גלישה לרוחב, ופיקסלים לבנים
   (כלל 35: נייטרליות — ערוץ כחול שהשיג את האדום).
   MSYS_NO_PATHCONV=1 node scripts/ref-shot.mjs <outdir> [w=1440] [h=900] */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const [dir, w = '1440', h = '900'] = process.argv.slice(2)
mkdirSync(dir, { recursive: true })
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', (e) => errs.push(String(e)))

for (const p of ['glossary', 'recommended-reading', 'sources', 'maps']) {
  await page.goto(`http://localhost:3000/${p}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${dir}/${p}-a.png` })
  await page.evaluate(() => scrollBy({ top: innerHeight * 0.85, behavior: 'instant' }))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${dir}/${p}-b.png` })
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  console.log(p, 'overflowX', over, 'height', await page.evaluate(() => document.documentElement.scrollHeight))
}

await page.goto('http://localhost:3000/glossary', { waitUntil: 'networkidle' })
await page.fill('.ref-search input', 'גיהאד')
await page.waitForTimeout(400)
await page.screenshot({ path: `${dir}/glossary-search.png` })
console.log('search גיהאד →', await page.locator('.ref-entry').count(), 'entries')
await page.fill('.ref-search input', '')
await page.click('.ref-letters a:has-text("ש")')
await page.waitForTimeout(2500) // גלילה חלקה של ~6000px; צילום מוקדם תופס אותה באמצע
await page.screenshot({ path: `${dir}/glossary-letter.png` })

await page.goto('http://localhost:3000/maps', { waitUntil: 'networkidle' })
await page.locator('.ref-map-btn').nth(2).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${dir}/maps-zoom.png` })
await page.keyboard.press('Escape')

await page.goto('http://localhost:3000/chapters', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const menu = page.locator('.menu-tools')
console.log('menu links', await menu.locator('a').count(), 'locked', await menu.locator('.is-locked').count())

console.log('errors', errs.length, errs.slice(0, 5).join(' | '))
await browser.close()
