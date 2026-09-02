import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
await page.goto('http://localhost:3000/chapter1/dev-character?model=/assets/chapter1/models/player2.glb&raw=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
const r = await page.evaluate(async () => {
  // מוצאים את הסצנה דרך ה-fiber root של הקנבס
  const c = document.querySelector('canvas')
  const key = Object.keys(c).find((k) => k.startsWith('__reactFiber'))
  // פשוט: דוגמים דרך __devDbg שהוספנו — אבל הפעם דרך polling של מיקום עצם
  return new Promise((res) => {
    const samples = []
    let n = 0
    const iv = setInterval(() => {
      const dbg = window.__devDbg
      // אין גישה ישירה לעצם — נשתמש ב-THREE דרך ה-scene אם חשוף
      samples.push(dbg ? JSON.stringify(dbg).length : -1)
      if (++n >= 5) { clearInterval(iv); res({ dbgLen: samples, feet: window.__devDbg?.feet, minY: window.__devMinY ?? 'n/a' }) }
    }, 300)
  })
})
console.log(JSON.stringify(r))
await browser.close()
