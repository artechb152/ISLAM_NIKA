/* Which JS does the game actually load, and does it contain today's code?
   Also: does console.log from the page reach us at all? */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const region = process.argv[2] || 'yathrib'
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } })
const pg = await ctx.newPage()
const js = new Set()
pg.on('response', (r) => { const u = r.url(); if (u.includes('/_next/') && u.endsWith('.js')) js.add(u) })
const got = []
pg.on('console', (m) => got.push(m.type() + ':' + m.text().slice(0, 80)))
await pg.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
await wait(4000)
await pg.evaluate(() => console.log('PROBE-XYZ from page'))
await wait(500)
console.log('capture test:', got.some((l) => l.includes('PROBE-XYZ')) ? 'console.log REACHES us' : 'console.log DOES NOT reach us')
console.log('TASKPROP lines seen:', got.filter((l) => l.includes('TASKPROP')).length)
let found = { taskprop: [], paint: [] }
for (const u of js) {
  const body = await (await ctx.request.get(u)).text()
  if (body.includes('TASKPROP')) found.taskprop.push(u.split('/').pop())
  if (body.includes('ch1paint')) found.paint.push(u.split('/').pop())
}
console.log('js chunks loaded:', js.size)
console.log('chunks with TASKPROP:', found.taskprop.join(', ') || 'NONE')
console.log('chunks with ch1paint:', found.paint.join(', ') || 'NONE')
await browser.close()
