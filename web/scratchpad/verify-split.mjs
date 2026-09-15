import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
for (const [w, h] of [[1440, 1000], [1920, 1080], [860, 900], [500, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const errs = []
  p.on('pageerror', e => errs.push(e.message.slice(0, 60)))
  await p.goto('http://localhost:3000/chapter2', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(1800)
  const m = await p.evaluate(() => {
    const s = document.querySelector('.ch2-lineage-split')
    const t = document.querySelector('.ch2-lineage-text')
    const f = document.querySelector('.ch2-lineage-photo')
    if (!s || !t || !f) return null
    const R = e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), t: Math.round(r.top) } }
    return { text: R(t), photo: R(f), win: innerWidth, cols: getComputedStyle(s).gridTemplateColumns,
             overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }
  })
  if (!m) { console.log(`${w}×${h}: ✗ לא נמצא`); await p.close(); continue }
  const sideBySide = Math.abs(m.text.t - m.photo.t) < 120
  const photoLeft = m.photo.l < m.text.l
  console.log(`${w}×${h}: טקסט ${m.text.l}–${m.text.r} · תמונה ${m.photo.l}–${m.photo.r} · ` +
    (sideBySide ? (photoLeft ? 'תמונה משמאל, טקסט מימין ✓' : 'התמונה מימין ✗') : 'זו מתחת לזו (מסך צר) ✓') +
    ` · גלישה ${m.overflow ? '✗' : '✓'} · שגיאות ${errs.length}`)
  await p.close()
}
await b.close()
