import { chromium } from 'playwright-core'
const S = process.argv[2]
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
for (const [name, url] of [['ch6','/chapter6'], ['ch1-entry','/chapter1'], ['chapters','/chapters'], ['home','/']]) {
  await p.goto('http://localhost:3000' + url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log(name, e.message))
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${S}/ref-${name}.png` })
  console.log(name, await p.title())
}
await b.close()
