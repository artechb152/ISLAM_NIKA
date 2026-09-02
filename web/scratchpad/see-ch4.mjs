import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)) })
const res = await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
console.log('status', res?.status())
await page.waitForTimeout(9000)
const info = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent,
  sections: document.querySelectorAll('.article-section').length,
  parts: document.querySelectorAll('.ch4-part').length,
  echoes: document.querySelectorAll('.ch4-echo').length,
  cards: document.querySelectorAll('.ch4-card').length,
  forces: document.querySelectorAll('.ch4-forces').length,
  defs: document.querySelectorAll('.ch4-def').length,
  rulings: document.querySelectorAll('.ch4-ruling').length,
  words: (document.querySelector('.chapter-article')?.innerText ?? '').split(/\s+/).filter(Boolean).length,
  overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
}))
console.log(JSON.stringify(info, null, 1))
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none')
await page.screenshot({ path: 'scratchpad/ch4-top.png' })
await page.evaluate(() => document.querySelector('#badr')?.scrollIntoView())
await page.waitForTimeout(1500)
await page.screenshot({ path: 'scratchpad/ch4-badr.png' })
await page.evaluate(() => document.querySelector('#rulings')?.scrollIntoView())
await page.waitForTimeout(1500)
await page.screenshot({ path: 'scratchpad/ch4-rulings.png' })
await b.close()
