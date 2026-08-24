/* Every console line during a border-post boot, unfiltered — is logging even reaching us? */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const region = process.argv[2] || 'border-post'
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
const lines = []
pg.on('console', (m) => lines.push(m.type() + ': ' + m.text().slice(0, 160)))
pg.on('pageerror', (e) => lines.push('PAGEERROR: ' + String(e).slice(0, 200)))
await pg.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
await wait(6000)
console.log('total console lines:', lines.length)
console.log(lines.filter((l) => /TASKPROP/.test(l)).slice(0, 10).join('\n') || '(no TASKPROP lines)')
console.log('--- sample ---')
console.log(lines.slice(0, 12).join('\n'))
await browser.close()
