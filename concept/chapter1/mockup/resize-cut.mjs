/* Downscale the transparent character cutouts, preserving alpha (PNG out). */
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const SRC = 'body'
const OUT = 'chars'
const HEIGHT = 680

fs.mkdirSync(OUT, { recursive: true })
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('-cut.png'))

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  defaultViewport: { width: 400, height: 300 },
})
const page = await browser.newPage()
await page.goto('about:blank')

let total = 0
for (const f of files) {
  const b64 = fs.readFileSync(path.join(SRC, f)).toString('base64')
  const out = await page.evaluate(async (dataUrl, h) => {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    // crop to the opaque bounding box first, then scale to target height
    const c0 = document.createElement('canvas')
    c0.width = img.naturalWidth
    c0.height = img.naturalHeight
    const x0 = c0.getContext('2d')
    x0.drawImage(img, 0, 0)
    const d = x0.getImageData(0, 0, c0.width, c0.height).data
    let minX = c0.width, minY = c0.height, maxX = 0, maxY = 0
    for (let y = 0; y < c0.height; y += 2) {
      for (let x = 0; x < c0.width; x += 2) {
        if (d[(y * c0.width + x) * 4 + 3] > 16) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    const bw = maxX - minX, bh = maxY - minY
    const w = Math.round((bw / bh) * h)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d').drawImage(img, minX, minY, bw, bh, 0, 0, w, h)
    return c.toDataURL('image/webp', 0.82)
  }, `data:image/png;base64,${b64}`, HEIGHT)
  const buf = Buffer.from(out.split(',')[1], 'base64')
  const name = f.replace(/-cut\.png$/, '.png')
  fs.writeFileSync(path.join(OUT, name), buf)
  total += buf.length
  console.log(name, (buf.length / 1024).toFixed(0) + 'kb')
}
console.log('total', (total / 1024 / 1024).toFixed(2), 'MB')
await browser.close()
