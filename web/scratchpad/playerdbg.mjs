import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1100, height: 620 } })).newPage()
pg.on('console', (m) => { if (m.type() === 'error') console.log('ERR:', m.text().slice(0, 200)) })
pg.on('pageerror', (e) => console.log('EXC:', String(e).slice(0, 200)))
await pg.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
await wait(8000)
console.log('pos:', JSON.stringify(await pg.evaluate(() => ({ p: { x: window.__ch1Live.player.x, z: window.__ch1Live.player.z }, r: window.__ch1Live.rawiPos }))))
await pg.evaluate(() => window.__ch1Live.player.set(window.__ch1Live.player.x + 12, 0, window.__ch1Live.player.z))
await wait(250)
await pg.screenshot({ path: 'scratchpad/tour/whois.png' })
console.log('dbg:', JSON.stringify(await pg.evaluate(() => window.__ch1Dbg)))
await browser.close()
