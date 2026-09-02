import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } })
for (const ch of ['chapter6', 'chapter4']) {
  const page = await ctx.newPage()
  await page.goto(`http://localhost:3000/${ch}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
  await page.waitForTimeout(7000)
  console.log(ch, JSON.stringify(await page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).backgroundColor : null }
    const root = getComputedStyle(document.documentElement)
    return {
      body: g('body'),
      article: g('.chapter-article'),
      content: g('.chapter-content'),
      paper: root.getPropertyValue('--paper').trim(),
      panel: root.getPropertyValue('--panel').trim(),
      mat: root.getPropertyValue('--mat').trim(),
    }
  })))
  await page.close()
}
await b.close()
