import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const p = await (await b.newContext({ viewport:{width:900,height:560} })).newPage()
const errs=[], fails=[]
p.on('pageerror', e=>errs.push(e.message.slice(0,180)))
p.on('requestfailed', r=>fails.push(r.url().split('/').pop()))
p.on('response', r=>{ if(r.status()>=400) fails.push(r.status()+' '+r.url().split('/').pop()) })
await p.addInitScript(()=>{ localStorage.setItem('ch1:intro:v1','1'); localStorage.setItem('ch1:arrived:exit:v1','1') })
await p.goto('http://localhost:3000/chapter1?region=exit', { waitUntil:'domcontentloaded' })
for (let i=0;i<30;i++){ await p.waitForTimeout(1000); let hit=false
  for (const btn of await p.$$('button')){ const t=await btn.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await btn.click(); hit=true; break} }
  if (hit) break }
await p.waitForTimeout(15000)
console.log('__ch1Live:', await p.evaluate(()=>!!window.__ch1Live))
console.log('__ch1Where:', await p.evaluate(()=>!!window.__ch1Where))
console.log('__ch1Audit:', await p.evaluate(()=>!!window.__ch1Audit))
console.log('arrive plate still up:', await p.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !!e && !e.classList.contains('is-gone')}))
console.log('pageerrors:', [...new Set(errs)].slice(0,4))
console.log('failed requests:', [...new Set(fails)].slice(0,6))
await p.screenshot({ path:'scratchpad/shots/exit-diag.png' })
await b.close()
