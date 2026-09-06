import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
const errs = []
page.on('pageerror', (e)=>errs.push(e.message.slice(0,140)))
await page.goto('http://localhost:3000/chapter1/practice', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.screenshot({ path: 'scratchpad/shots/practice-top.png' })
const qs = await page.$$eval('.p2-q, .article-section', (els)=>els.length)
console.log('sections/questions:', qs, 'errors:', errs)
// play the summary video in isolation
await page.setContent(`<video id=v src="http://localhost:3000/assets/anim-video/ch1-summary.mp4" poster="http://localhost:3000/assets/anim-video/ch1-summary-poster.jpg" muted playsinline></video>`)
const info = await page.evaluate(async () => {
  const v = document.getElementById('v')
  await v.play().catch(()=>{})
  await new Promise(r=>setTimeout(r,2500))
  return { t: v.currentTime, dur: v.duration, w: v.videoWidth, h: v.videoHeight, err: v.error && v.error.code }
})
console.log('video:', JSON.stringify(info))
await browser.close()
