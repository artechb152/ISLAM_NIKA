import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1100, height: 620 } })).newPage()
await pg.goto('http://localhost:3000/chapter1?region=loading-road', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
await wait(6000)
const d1 = await pg.evaluate(() => window.__ch1Live.dynamic.map((c) => ({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), r: c.r })))
await wait(2500)
const d2 = await pg.evaluate(() => window.__ch1Live.dynamic.map((c) => ({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), r: c.r })))
console.log('dynamic:', d1.length)
console.log(JSON.stringify(d1))
console.log('moved:', JSON.stringify(d2.map((c, i) => +Math.hypot(c.x - d1[i].x, c.z - d1[i].z).toFixed(2))))
await browser.close()
