/* Chapter 12 — the desk, a hover on a folder, the dive (mid-flight and landed), then every
   unit: its open folder and a screen further in. Viewport shots; also console errors,
   horizontal overflow, and whether the heading box lies inside its sheet.
   MSYS_NO_PATHCONV=1 node scripts/ch12-shot.mjs <outdir> [w=1440] [h=900] */
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
await page.goto('http://localhost:3000/chapter12', { waitUntil: 'load', timeout: 120000 })
await page.evaluate(() => localStorage.removeItem('ch12:v1'))
await page.reload({ waitUntil: 'load', timeout: 120000 })
await page.waitForTimeout(1500)
const reveal = () => page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-inview')))
await page.screenshot({ path: `${dir}/00-desk.png` })
await page.locator('.ch12-desk-hit a').nth(2).hover({ force: true })
await page.waitForTimeout(400)
await page.screenshot({ path: `${dir}/01-hover.png` })
await page.locator('.ch12-desk-hit a').nth(0).click({ force: true })
await page.waitForTimeout(420)
await page.screenshot({ path: `${dir}/02-dive.png` })
await page.waitForTimeout(1200); await reveal()
await page.screenshot({ path: `${dir}/03-landed.png` })
for (const [i, id] of ['jihad', 'roots', 'ribat', 'istishhad', 'charter'].entries()) {
  await page.evaluate((id) => { location.hash = id }, id)   /* one folder, one screen — the hash opens it */
  await page.waitForTimeout(1200); await reveal()
  await page.screenshot({ path: `${dir}/${i + 1}-${id}-a.png` })
  /* the heading box must sit on its sheet: its four corners inside the image */
  const fit = await page.evaluate((id) => {
    const box = document.querySelector(`#${id} .ch12-open`).getBoundingClientRect()
    const pg = document.querySelector(`#${id} .ch12-open-page`).getBoundingClientRect()
    const h2 = document.querySelector(`#${id} .ch12-open-page h2`)
    return { inside: pg.left >= box.left - 1 && pg.right <= box.right + 1 && pg.top >= box.top - 1 && pg.bottom <= box.bottom + 1,
      page: [Math.round(pg.left - box.left), Math.round(pg.top - box.top), Math.round(pg.width), Math.round(pg.height)],
      h2overflow: h2.scrollWidth > h2.clientWidth + 2 }
  }, id)
  console.log(id, JSON.stringify(fit))
  for (const k of [1, 2, 3]) {
    await page.evaluate(() => scrollBy({ top: innerHeight * 0.85, behavior: 'instant' }))
    await page.waitForTimeout(500); await reveal()
    await page.screenshot({ path: `${dir}/${i + 1}-${id}-${String.fromCharCode(97 + k)}.png` })
  }
}
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
console.log('overflowX', over, 'errors', errs.length, errs.slice(0, 5).join(' | '))
await browser.close()
