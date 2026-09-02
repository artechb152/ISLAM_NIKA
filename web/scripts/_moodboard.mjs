import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'
const ROOT = 'C:/Users/nikag/ISLAM_NIKA/concept/chapter3/moodboard/'
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewportSize: { width: 1180, height: 1000 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(ROOT + 'moodboard.html').href, { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
await p.screenshot({ path: ROOT + 'moodboard.png', fullPage: true })
console.log('height', await p.evaluate(() => document.body.scrollHeight))
// also a tight shot of just the spread, for a close look at the panels
const book = await p.$('.book')
await book.screenshot({ path: ROOT + 'spread.png' })
await b.close()
