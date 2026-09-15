import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
for (const [w, h] of [[1440, 1000], [1920, 1080], [860, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const bad = []
  p.on('pageerror', e => bad.push('JS ' + e.message.slice(0, 50)))
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().split('/').pop()) })
  await p.goto('http://localhost:3000/chapter2', { waitUntil: 'networkidle', timeout: 120000 })
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)) } })
  await p.waitForTimeout(1800)
  const m = await p.evaluate(() => {
    const f = document.querySelector('.ch2-mecca-illus')
    const t = document.querySelector('.ch2-mecca-body')
    if (!f) return null
    const i = f.querySelector('img')
    const R = e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) } }
    const cs = getComputedStyle(i)
    return { src: i.getAttribute('src').split('/').pop(), nat: i.naturalWidth + 'x' + i.naturalHeight,
             photo: R(f), text: t ? R(t) : null, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
             mask: cs.maskImage === 'none' && cs.webkitMaskImage === 'none' ? 'ללא' : 'יש',
             cap: f.querySelector('figcaption')?.textContent.trim().slice(0, 34), win: innerWidth }
  })
  if (!m) { console.log(`${w}: ✗`); await p.close(); continue }
  const right = m.text ? m.photo.l > m.text.l : null
  console.log(`${w}×${h}: ${m.src} (${m.nat}) · תמונה ${m.photo.l}–${m.photo.r} · טקסט ${m.text?.l}–${m.text?.r} · ` +
    (right === null ? '' : right ? 'תמונה מימין ✓' : 'תמונה משמאל ✗') +
    ` · מסגרת ${m.border} · מסכה ${m.mask} · כיתוב "${m.cap}" · תקלות ${bad.length}`)
  await p.close()
}
await b.close()
