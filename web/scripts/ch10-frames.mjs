/* Chapter 10 — a 3×3 sheet of frames from a clip (no ffmpeg on this machine; Chrome seeks).
   node scripts/ch10-frames.mjs public/assets/chapter10/hero.mp4 out.png */
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
const [clip, out] = process.argv.slice(2)
const CHROME = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b64 = (await readFile(clip)).toString('base64')
const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 1290, height: 750 } })
await page.setContent(`<body style="margin:0;background:#000"><video id=v muted src="data:video/mp4;base64,${b64}"></video><canvas id=c width=1290 height=726></canvas></body>`)
const info = await page.evaluate(async () => {
  const v = document.getElementById('v'), c = document.getElementById('c').getContext('2d')
  await new Promise((r) => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, { once: true }))
  v.style.display = 'none'
  for (let i = 0; i < 9; i++) {
    v.currentTime = (v.duration - 0.05) * i / 8
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }))
    c.drawImage(v, (i % 3) * 430, Math.floor(i / 3) * 242, 430, 242)
  }
  return { duration: v.duration, w: v.videoWidth, h: v.videoHeight }
})
await page.locator('#c').screenshot({ path: out })
console.log(JSON.stringify(info))
await browser.close()
