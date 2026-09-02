import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type().toUpperCase(), m.text().slice(0, 180)) })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)))
page.on('requestfailed', (r) => console.log('REQFAIL', r.url().slice(-70), r.failure()?.errorText))
await page.addInitScript(() => { localStorage.setItem('ch1:intro:v1', '1'); localStorage.setItem('ch1:arrived:night-camp:v1', '1') })
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
for (const btn of await page.$$('button')) { const t = await btn.innerText().catch(()=> ''); if (t.includes('התחילו') || t.includes('המשיכו')) { await btn.click(); console.log('clicked', t.trim()); break } }
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000)
  const s = await page.evaluate(() => ({ live: !!window.__ch1Live, arrive: document.querySelector('.ch1-arrive')?.className ?? null, canvas: !!document.querySelector('canvas'), body: document.body.innerText.slice(0,80).replace(/\n/g,'|') }))
  console.log(i * 5 + 's', JSON.stringify(s))
  if (s.live) break
}
await page.screenshot({ path: 'scratchpad/diag.png' })
await b.close()
