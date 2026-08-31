import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
const pending = new Map()
pg.on('request', (r) => { if (r.url().includes('.glb')) pending.set(r.url(), 'pending') })
pg.on('requestfinished', (r) => { if (r.url().includes('.glb')) pending.set(r.url(), 'ok') })
pg.on('requestfailed', (r) => { if (r.url().includes('.glb')) pending.set(r.url(), 'FAILED: ' + (r.failure()?.errorText || '?')) })
pg.on('pageerror', (e) => console.log('PAGE EXC:', String(e).slice(0, 300)))
pg.on('console', (m) => { const t = m.text(); if (/TASKPROP|error|Error|NaN/.test(t)) console.log('C[' + m.type() + ']:', t.slice(0, 400)) })
await pg.addInitScript(() => { window.addEventListener('unhandledrejection', (e) => console.log('UNHANDLED REJECTION: ' + String(e.reason).slice(0, 300))) })
await pg.goto('http://localhost:3000/chapter1?region=yathrib', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
// ARRIVAL-WAIT: full boot like the real harnesses
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(3000)
const nf = await pg.evaluate(() => { window.__ch1Live.player.set(-3.8, 0, 14.8); return true })
await wait(2500)
console.log('nearFind:', await pg.evaluate(() => window.__ch1Live.nearFind))
await pg.screenshot({ path: 'scratchpad/tour/netdebug.png' })
const rows = [...pending.entries()].map(([u, s]) => s + '  ' + u.split('/').pop())
console.log(rows.sort().join('\n'))
await browser.close()
