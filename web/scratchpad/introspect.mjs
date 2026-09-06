import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
await page.addInitScript(() => { localStorage.setItem('ch1:intro:v1','1'); localStorage.setItem('ch1:arrived:night-camp:v1','1') })
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' })
let ok=false
for (let i=0;i<30&&!ok;i++){await page.waitForTimeout(1000);for(const btn of await page.$$('button')){const t=await btn.innerText().catch(()=>'');if(t.includes('התחילו')||t.includes('המשיכו')){await btn.click();ok=true;break}}}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 90000 })
await page.waitForTimeout(6000)
console.log(JSON.stringify(await page.evaluate(() => ({
  liveKeys: Object.keys(window.__ch1Live),
  url: location.href,
  arrive: document.querySelector('.ch1-arrive')?.className ?? null,
  leave: document.querySelector('.ch1-leave')?.className ?? null,
  hudClasses: [...document.querySelectorAll('[class*="ch1-"],[class*="hud-"]')].map(e=>e.className).slice(0,25),
})), null, 1))
await b.close()
