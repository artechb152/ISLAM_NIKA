import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewportSize: { width: 1180, height: 1000 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(resolve('concept/chapter3/moodboard/moodboard.html')).href, { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
await p.screenshot({ path: 'concept/chapter3/moodboard/moodboard.png', fullPage: true })
const h = await p.evaluate(() => document.body.scrollHeight)
console.log('rendered, page height', h)
await b.close()
