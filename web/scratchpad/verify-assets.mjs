import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const bad = []
p.on('pageerror', e => bad.push('JS: ' + e.message.slice(0, 70)))
p.on('response', r => { if (r.status() >= 400) bad.push(`HTTP ${r.status()} ${r.url().split('/').pop()}`) })
await p.goto('http://localhost:3000/chapter2', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2500)
const figs = await p.evaluate(() => [...document.querySelectorAll('.ch2-photo')].map(f => {
  const i = f.querySelector('img')
  return { src: i.getAttribute('src').split('/').pop(), w: i.naturalWidth, h: i.naturalHeight,
           shown: Math.round(i.getBoundingClientRect().width), cap: f.querySelector('figcaption').textContent.trim().slice(0, 44) }
}))
for (const f of figs) console.log(`תמונה ${f.src} · טבעי ${f.w}×${f.h} · מוצג ${f.shown}px · כיתוב: ${f.cap}`)
const watch = await p.evaluate(() => {
  const a = document.querySelector('.ch2-watch')
  return a ? { title: a.querySelector('h3').textContent.trim(), links: [...a.querySelectorAll('a')].map(x => ({ t: x.textContent.trim(), href: x.href, blank: x.target })) } : null
})
console.log('גוש הסרטונים:', JSON.stringify(watch, null, 1))
console.log('תקלות:', bad.length, bad.slice(0, 4))
await b.close()
