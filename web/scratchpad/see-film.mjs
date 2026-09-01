import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:mecca:v1', '1')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({
    seen: ['abraha-story'], entries: [24], region: 'mecca', found: [], solved: [],
  }))
})
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
for (const b of await page.$$('button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break }
}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForSelector('.has-film', { timeout: 30000 })
await page.waitForTimeout(4000)
await page.screenshot({ path: 'scratchpad/cinema-abraha.png' })
const v = await page.evaluate(() => {
  const vid = document.querySelector('video.hud-film')
  return vid ? { src: vid.src.split('/').pop(), muted: vid.muted, loop: vid.loop, playing: !vid.paused, t: +vid.currentTime.toFixed(1), w: vid.clientWidth, h: vid.clientHeight } : null
})
console.log(JSON.stringify(v))
await browser.close()
