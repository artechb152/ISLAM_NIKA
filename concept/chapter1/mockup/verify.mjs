/* Screenshot each mockup frame individually — the reliable way to check that
   every screen composed correctly. */
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--window-size=1500,1000', '--disable-gpu-sandbox'],
  defaultViewport: { width: 1500, height: 1000 },
})
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
page.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160))
})

await page.goto(
  'file:///C:/Users/wolft/AppData/Local/Temp/claude/c--Users-wolft-Desktop------/191e2dcd-12ce-4fb5-b475-f1edd13163c4/scratchpad/mock/screens.html',
  { waitUntil: 'networkidle0', timeout: 60000 },
)
await new Promise((r) => setTimeout(r, 2500))

const frames = await page.$$('.entry .frame')
console.log('frames found:', frames.length)
for (let i = 0; i < frames.length; i++) {
  await frames[i].screenshot({ path: `frame-${i}.png` })
}

// sanity: nothing invisible, nothing overflowing sideways
const health = await page.evaluate(() => {
  const zero = [...document.querySelectorAll('.entry')].filter(
    (e) => getComputedStyle(e).opacity !== '1',
  ).length
  return {
    entries: document.querySelectorAll('.entry').length,
    invisible: zero,
    hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    docHeight: document.documentElement.scrollHeight,
  }
})
console.log('health:', JSON.stringify(health))
console.log('errors:', errs.length ? errs : 'none')
await browser.close()
