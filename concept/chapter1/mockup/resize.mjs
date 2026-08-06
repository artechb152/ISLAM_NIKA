/* The generated plates are 2688x1520 PNGs (~6 MB each). Downscale to the width
   the frame actually renders at and re-encode as JPEG, via a headless canvas —
   there is no Pillow/ImageMagick on this box. */
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [SRC = 'gen', OUT = 'plates', W = '1280', Q = '0.76'] = process.argv.slice(2)
const WIDTH = Number(W)
const QUALITY = Number(Q)

fs.mkdirSync(OUT, { recursive: true })
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.png'))

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
  const out = await page.evaluate(
    async (dataUrl, w, q) => {
      const img = new Image()
      img.src = dataUrl
      await img.decode()
      const h = Math.round((img.naturalHeight / img.naturalWidth) * w)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      return c.toDataURL('image/jpeg', q)
    },
    `data:image/png;base64,${b64}`,
    WIDTH,
    QUALITY,
  )
  const buf = Buffer.from(out.split(',')[1], 'base64')
  const name = f.replace(/\.png$/, '.jpg')
  fs.writeFileSync(path.join(OUT, name), buf)
  total += buf.length
  console.log(name, (buf.length / 1024).toFixed(0) + 'kb')
}
console.log('total', (total / 1024 / 1024).toFixed(2), 'MB')
await browser.close()
