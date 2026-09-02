import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ channel: 'chrome', headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1500, height: 950 })
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle0' })
await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('is-inview')))
const snap = () => p.evaluate(() => {
  const n = document.querySelector('#n-heart-body')?.closest('.ch3-note') || document.querySelectorAll('.ch3-note')[1]
  const btn = n.querySelector('.ch3-note-btn'), body = n.querySelector('.ch3-note-body')
  const g = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { h: Math.round(r.height), vis: c.visibility, disp: c.display, op: c.opacity, rows: c.gridTemplateRows } }
  return { open: n.classList.contains('is-open'), note: g(n), btn: g(btn), body: g(body), expanded: btn.getAttribute('aria-expanded') }
})
console.log('before:', JSON.stringify(await snap()))
await p.evaluate(() => { const n = document.querySelectorAll('.ch3-note')[1]; n.querySelector('.ch3-note-btn').click() })
await new Promise(r => setTimeout(r, 700))
console.log('after :', JSON.stringify(await snap()))
const D = 'C:/Users/nikag/AppData/Local/Temp/claude/C--Users-nikag/19562ce8-acdd-420b-8e32-966c20959c71/scratchpad/'
const el = await p.$('#birth'); const box = await el.boundingBox()
await p.screenshot({ path: D + 'note.png', clip: { x: box.x, y: Math.max(0, box.y + box.height - 420), width: box.width, height: 420 }, captureBeyondViewport: true })
await b.close()
