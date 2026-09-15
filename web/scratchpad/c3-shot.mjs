import { chromium } from 'playwright-core'
const S = process.argv[2]
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
for (const [w,h] of [[1440,900],[1280,800],[1920,1080]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForTimeout(2500)
  const m = await p.evaluate(() => {
    const bk = document.querySelector('.c3-book'); const st = document.querySelector('.c3-stage')
    const r = bk?.getBoundingClientRect(); const s = st?.getBoundingClientRect()
    const arrows = [...document.querySelectorAll('.c3-arrow')].map(a => {
      const ar = a.getBoundingClientRect()
      return { cls: a.className, label: a.getAttribute('aria-label'), x: Math.round(ar.x), path: a.querySelector('path')?.getAttribute('d') }
    })
    return { book: r && { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) },
             stage: s && { w: Math.round(s.width), h: Math.round(s.height) },
             win: { w: innerWidth, h: innerHeight }, arrows,
             dir: getComputedStyle(document.documentElement).direction }
  })
  console.log(w+'x'+h, JSON.stringify(m))
  await p.screenshot({ path: `${S}/c3-${w}.png` })
  await p.close()
}
await b.close()
