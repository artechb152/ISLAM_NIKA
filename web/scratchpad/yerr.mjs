import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage()
const msgs = []
page.on('console', (m) => { if (m.type()==='error'||m.type()==='warning') msgs.push(m.type()+': '+m.text().slice(0,200)) })
page.on('pageerror', (e) => msgs.push('PAGEERROR: '+e.message.slice(0,200)))
page.on('requestfailed', (r) => msgs.push('REQFAIL: '+r.url().slice(-60)))
await page.addInitScript(() => { localStorage.setItem('ch1:intro:v1','1'); localStorage.setItem('ch1:arrived:yathrib:v1','1') })
await page.goto('http://localhost:3000/chapter1?region=yathrib', { waitUntil: 'domcontentloaded' })
for (let i=0;i<30;i++){ await page.waitForTimeout(1000); for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); i=99; break} } }
await page.waitForTimeout(9000)
const a = await page.evaluate(()=>window.__ch1Audit)
console.log('unapproved:', JSON.stringify(a?.unapproved, null, 1))
console.log('--- console ---'); for (const m of [...new Set(msgs)].slice(0,20)) console.log(m)
await browser.close()
