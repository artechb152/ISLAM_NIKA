import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(e.message.slice(0, 80)))
await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2000)
/* דפדוף עד שמגיעים לקוביה 6 */
for (let i = 0; i < 4; i++) { await p.click('.c3-arrow.is-next'); await p.waitForTimeout(1100) }
const t = await p.evaluate(() => document.body.textContent)
const want = [
  ['הלא ראית מה עולל ריבונך לבעלי הפיל', 'פסוק סורת הפיל א'],
  ['ועשה אותם כמוץ נאכל', 'פסוק סורת הפיל ב'],
]
for (const [w, l] of want) console.log((t.includes(w) ? '  ✓ ' : '  ✗ ') + l)
const verse = await p.evaluate(() => [...document.querySelectorAll('.c3-verse, [class*=verse]')].map(e => e.className + ' → ' + e.textContent.trim().slice(0, 50)))
console.log('קופסאות פסוק על הפרוש:', JSON.stringify(verse, null, 1).slice(0, 400))
console.log('שגיאות:', errs.length, errs.slice(0, 2))
await b.close()
