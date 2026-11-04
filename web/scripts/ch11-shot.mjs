/* Chapter 11 — the article at the top of each section, and on 03–05 every point on the map
   pressed in turn (then „חזרה למפה"). Viewport shots; also console errors and overflow.
   MSYS_NO_PATHCONV=1 node scripts/ch11-shot.mjs <outdir> [w=1440] [h=900] [only=all|sectionId,...] */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const [dir, w = '1440', h = '900', only = 'all'] = process.argv.slice(2)
mkdirSync(dir, { recursive: true })
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME, args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', (e) => errs.push(String(e)))
await page.goto('http://localhost:3000/chapter11', { waitUntil: 'load', timeout: 120000 })
await page.evaluate(() => localStorage.removeItem('ch11:v1'))
await page.reload({ waitUntil: 'load', timeout: 120000 })
await page.waitForTimeout(1500)
const reveal = () => page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-inview')))
await reveal()
await page.screenshot({ path: `${dir}/00-top.png` })
const ids = ['way', 'sources', 'schools', 'wasatiyya', 'salafiyya'].filter((id) => only === 'all' || only.split(',').includes(id))
for (const [i, id] of ids.entries()) {
  /* the section's heading at the top, then a screen further in */
  await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'start', behavior: 'instant' }), id)
  await page.waitForTimeout(1800); await reveal()
  await page.screenshot({ path: `${dir}/${i + 1}-${id}-a.png` })
  await page.evaluate(() => scrollBy({ top: innerHeight * 0.8, behavior: 'instant' }))
  await page.waitForTimeout(900); await reveal()
  await page.screenshot({ path: `${dir}/${i + 1}-${id}-b.png` })
  if (await page.locator(`#${id} .ch11-stage`).count()) await page.waitForSelector(`#${id} .ch11-point`, { state: "attached", timeout: 60000 }).catch(() => {}); const n = await page.locator(`#${id} .ch11-pop`).count(); console.log(id, "points", n)
  /* the map in view (it opens on the first station), then every station by „הבא“ */
  if (!n) continue
  await page.evaluate((id) => document.querySelector('#' + id + ' .ch11-stage').scrollIntoView({ block: 'center', behavior: 'instant' }), id)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${dir}/${i + 1}-${id}-map.png` })
  for (let k = 0; k < n; k++) {
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `${dir}/${i + 1}-${id}-p${k + 1}.png` })
    if (k < n - 1) try { await page.locator(`#${id} .ch11-pop[open] .ch11-pop-nav button`).last().click({ timeout: 3000 }) } catch { console.log('no next', id, k + 1) }
  }
  await page.waitForTimeout(1600)
}
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
console.log('overflowX', over, 'errors', errs.length, errs.slice(0, 5).join(' | '))
await browser.close()
