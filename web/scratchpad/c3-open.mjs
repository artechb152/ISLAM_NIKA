import { chromium } from 'playwright-core'
const S = process.argv[2]
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle', timeout: 90000 })
await p.waitForTimeout(2000)
await p.click('.c3-arrow.is-next'); await p.waitForTimeout(1600)
const m = await p.evaluate(() => {
  const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y)} }
  const shell = document.querySelector('.c3-shell')
  const kids = shell ? [...shell.children].map(c => { const r = c.getBoundingClientRect(); return { cls: c.className.slice(0,40), h: Math.round(r.height) } }) : []
  return { book: q('.c3-book'), stage: q('.c3-stage'), shell: q('.c3-shell'), header: q('.chapter-site-header'), kids, win: {w:innerWidth,h:innerHeight} }
})
console.log(JSON.stringify(m, null, 1))
await p.screenshot({ path: `${S}/c3-open.png` })
await b.close()
