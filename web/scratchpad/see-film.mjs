import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.goto('http://localhost:3000/chapter4', { waitUntil: 'domcontentloaded', timeout: 180000 })
await page.waitForTimeout(9000)
const f = await page.$('.ch4-film')
await f?.scrollIntoViewIfNeeded(); await page.waitForTimeout(900)
await f?.screenshot({ path: 'scratchpad/film-idle.png' })
await page.evaluate(() => { const v = document.querySelector('.ch4-film-video'); if (v) { v.muted = true; v.currentTime = 9; v.play() } })
await page.waitForTimeout(2500)
console.log(JSON.stringify(await page.evaluate(() => ({
  cue: document.querySelector('.ch4-film-cue')?.textContent ?? null,
  t: Math.round(document.querySelector('.ch4-film-video')?.currentTime ?? 0),
  dur: Math.round(document.querySelector('.ch4-film-video')?.duration ?? 0),
  hasAudioTrack: !!document.querySelector('track'),
}))))
await f?.screenshot({ path: 'scratchpad/film-playing.png' })
console.log('errors:', errs.length ? errs : 'none')
await b.close()
