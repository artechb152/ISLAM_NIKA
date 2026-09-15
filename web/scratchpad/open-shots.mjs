import { chromium } from 'playwright-core'
const S = process.argv[2]
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
for (const [w, h] of [[1440, 900], [1280, 720]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('http://localhost:3000/chapter1', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(2500)
  await p.screenshot({ path: `${S}/open-${w}.png` })
  const sh = await p.evaluate(() => document.documentElement.scrollHeight)
  console.log(`entry ${w}x${h}: scrollHeight ${sh} (${sh <= h ? 'מסך אחד' : 'גולל!'}) · button: ${(await (document => document)(0), '')}`)
  await p.close()
}
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:3000/chapter1/practice', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(2500)
console.log('practice visible sections:', await p.$$eval('.article-section.p2-q', a => a.filter(e => !e.hidden).length), '· steps nav:', await p.$$eval('.p1-steps', a => a.length))
await p.screenshot({ path: `${S}/practice-full.png`, fullPage: true })
await b.close()
