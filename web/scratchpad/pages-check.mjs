import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage()
const bad = []
page.on('requestfailed', r => bad.push('FAIL '+r.url().replace('http://localhost:4321','')))
page.on('response', r => { if (r.status()>=400) bad.push(r.status()+' '+r.url().replace('http://localhost:4321','')) })
page.on('pageerror', e => bad.push('JS '+e.message.slice(0,110)))
await page.goto('http://localhost:4321/ISLAM_NIKA/chapter1/', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Live, null, { timeout:150000 }).catch(()=>{})
await page.waitForTimeout(9000)
await page.screenshot({ path:'scratchpad/shots/pages-chapter1.png' })
console.log('live:', await page.evaluate(()=>!!window.__ch1Live))
await page.goto('http://localhost:4321/ISLAM_NIKA/chapter1/practice/', { waitUntil:'networkidle' })
await page.waitForTimeout(2000)
await page.screenshot({ path:'scratchpad/shots/pages-practice.png' })
console.log('practice sections:', await page.$$eval('.article-section',e=>e.length))
console.log('problems:', [...new Set(bad)].slice(0,12))
await browser.close()
