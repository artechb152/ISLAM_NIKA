import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:3000/chapter2', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2000)
const ps = await p.evaluate(() => [...document.querySelectorAll('.ch2-wide p, .ch2-body p')].map(e => e.textContent.trim()).filter(t => t.includes('כעבה') || t.includes('אברהם')))
for (const t of ps) console.log('  ¶', t.slice(0, 200))
await b.close()
