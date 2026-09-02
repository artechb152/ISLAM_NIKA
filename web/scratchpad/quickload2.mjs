import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1100, height: 700 } })).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)) })
await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('ch1:intro:v1', '1'); localStorage.setItem('ch1:arrived:night-camp:v1', '1'); localStorage.setItem('ch1:notebook:v1', JSON.stringify({seen:['rawi-intro'],entries:[2],region:'night-camp',found:[],solved:[]})) })
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
for (const b of await page.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break } }
for (let i = 0; i < 20; i++) {
  const live = await page.evaluate(() => !!window.__ch1Live)
  if (live) { console.log('live after ~' + i * 2 + 's'); break }
  await page.waitForTimeout(2000)
}
await page.screenshot({ path: 'scratchpad/quickload.png' })
await browser.close()
