import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ channel: 'chrome', headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
for (const w of [1500, 1920]) {
  await p.setViewport({ width: w, height: 1000 })
  await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle0' })
  await p.evaluate(() => { document.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('is-inview')); document.querySelectorAll('img').forEach(i => i.loading = 'eager') })
  await new Promise(r => setTimeout(r, 1200))
  console.log(w, JSON.stringify(await p.evaluate(() => {
    const wp = document.querySelector('#elephant .ch3-withplate')
    const body = wp.querySelector('.ch3-body'), img = wp.querySelector('img')
    const g = e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } }
    return { row: g(wp), text: g(body), img: g(img), gapAboveText: Math.round(body.getBoundingClientRect().top - wp.getBoundingClientRect().top) }
  })))
}
const D = 'C:/Users/nikag/AppData/Local/Temp/claude/C--Users-nikag/19562ce8-acdd-420b-8e32-966c20959c71/scratchpad/'
const el = await p.$('#elephant .ch3-withplate'); const box = await el.boundingBox()
await p.screenshot({ path: D + 'eleph-big.png', clip: { x: box.x, y: box.y, width: box.width, height: box.height }, captureBeyondViewport: true })
await b.close()
