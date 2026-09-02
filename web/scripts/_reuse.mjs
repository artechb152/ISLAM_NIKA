import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ channel: 'chrome', headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1500, height: 950 })
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle0' })
await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('is-inview')))
const D = 'C:/Users/nikag/AppData/Local/Temp/claude/C--Users-nikag/19562ce8-acdd-420b-8e32-966c20959c71/scratchpad/'
const sub = await p.$('#maakul')
const box = await sub.boundingBox()
await p.screenshot({ path: D + 'reuse2.png', clip: { x: box.x - 20, y: box.y - 20, width: Math.min(1400, box.width + 700), height: 460 }, captureBeyondViewport: true })
console.log('shot')
await b.close()
