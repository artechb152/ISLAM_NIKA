/* Chapter 1 article pilot — viewport shots of the shell and of the crate in each of its
   states, plus the rail against chapter 7 at the same width.
   MSYS_NO_PATHCONV=1 node scripts/_ch1a-shot.mjs <outdir> */
import { chromium } from 'playwright-core'
const [dir] = process.argv.slice(2)
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME })
const B = 'http://localhost:3000'

const errs = []
const open = async (w, h, route) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.goto(B + route, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForSelector('.chapter-article', { timeout: 90000 }); await page.waitForTimeout(1500)
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-inview')))
  await page.waitForTimeout(400)
  return page
}

/* the rail, both chapters, same width */
for (const [route, tag] of [['/chapter1-article', 'c1'], ['/chapter7', 'c7']]) {
  const p = await open(1440, 900, route)
  const rail = await p.evaluate(() => {
    const a = document.querySelector('#chapter-menu')
    const r = a?.getBoundingClientRect()
    return { w: Math.round(r?.width ?? 0), cls: a?.className }
  })
  console.log(tag, 'rail', JSON.stringify(rail))
  await p.screenshot({ path: `${dir}/top-${tag}.png` })
  await p.close()
}

/* the crate, state by state */
const p = await open(1440, 900, '/chapter1-article')
const crate = p.locator('.ch1-crate')
await crate.scrollIntoViewIfNeeded()
await p.evaluate(() => window.scrollBy(0, -120))
await p.waitForTimeout(300)
await crate.screenshot({ path: `${dir}/crate-0.png` })
const box = await p.locator('.ch1-yard-zone').boundingBox()
const zone = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
/* silk by drag, spices by tap */
const silk = await p.locator('.ch1-thing', { hasText: 'משי' }).boundingBox()
await p.mouse.move(silk.x + silk.width / 2, silk.y + silk.height / 2)
await p.mouse.down()
await p.mouse.move(zone.x - 40, zone.y, { steps: 12 })
await p.screenshot({ path: `${dir}/crate-drag.png`, clip: await crate.boundingBox() })
await p.mouse.move(zone.x, zone.y, { steps: 4 })
await p.mouse.up()
await p.waitForTimeout(500)
await p.locator('.ch1-thing', { hasText: 'תבלינים' }).click()
await p.waitForTimeout(600)
await crate.screenshot({ path: `${dir}/crate-1.png` })
await p.locator('.ch1-thing.is-idea').click()
await p.waitForTimeout(300)
await crate.screenshot({ path: `${dir}/crate-2-shake.png` })
await p.waitForTimeout(1800)
await crate.screenshot({ path: `${dir}/crate-3-drift.png` })
await p.waitForTimeout(4500)
await crate.screenshot({ path: `${dir}/crate-4-end.png` })
const state = await p.evaluate(() => ({
  goods: document.querySelectorAll('.ch1-yard-loaded').length,
  tray: [...document.querySelectorAll('.ch1-thing')].map((n) => n.textContent),
  said: document.querySelector('.ch1-yard-state')?.textContent,
}))
console.log('state', JSON.stringify(state))
await p.close()

/* phone */
const m = await open(390, 844, '/chapter1-article')
const mc = m.locator('.ch1-crate')
await mc.scrollIntoViewIfNeeded()
await mc.screenshot({ path: `${dir}/crate-phone.png` })
const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
console.log('phone overflowX', over)
await m.close()

console.log('errors', errs.length)
/* the hydration message puts the diff on lines starting with + / - ; print those */
for (const e of errs) for (const line of e.split('\n')) if (/^\s*[+-]\s/.test(line) || /^(A tree|Error)/.test(line)) console.log('ERR>>> ' + line.slice(0, 220))
await browser.close()
