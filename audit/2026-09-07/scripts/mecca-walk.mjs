/* מכה, צעד אחר צעד, עם צילום בכל צעד — כדי לראות מה מבלבל. */
import fs from 'node:fs'
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page); const say=console.log
let n=0; const snap=async(label)=>{ n++; const f=`${OUT}/shots/mecca-walk-${String(n).padStart(2,'0')}-${label}.png`; await page.screenshot({path:f})
  const obj=await page.evaluate(()=>(document.querySelector('.hud-objective')?.textContent??'').trim().slice(0,90))
  say(`${String(n).padStart(2,'0')} ${label} · שלב ${(await K.W()).stage} · מטרה: "${obj}"`) }
await K.start('mecca')
await snap('הגעה')
let w=await K.W()
for (let r=0;r<12;r++){ const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  w=await K.W(); if (w.stage!=='brief' && !owed) break
  const p=await K.L(); const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
  await K.walk(c.x,c.z,2.2); await K.talk()
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1200)
  if (r<3) await snap(`שיחה-${r+1}`)
  await K.talk() }
await snap('אחרי-השיחות')
for (let g=0;g<8;g++){ w=await K.W(); if(w.stage!=='look') break
  const f=w.finds.find(x=>!x.done); if(!f) break
  await K.walk(f.x,f.z,1.7); await page.keyboard.press('KeyE'); await page.waitForTimeout(1300)
  await snap(`ראיה-${g+1}`)
  await page.keyboard.press('Escape'); await page.waitForTimeout(400) }
w=await K.W()
await K.walk(w.task.x, w.task.z+1.6, 1.0); await page.waitForTimeout(4000)
say('   מרחק מהשולחן:', Math.hypot((await K.L()).x-w.task.x, (await K.L()).z-w.task.z).toFixed(2), '· atTask:', await page.evaluate(()=>!!window.__ch1Live.atTask), '· תקריב:', await page.evaluate(()=>!!window.__ch1Live.taskFocus))
await snap('ליד-השולחן')
await page.keyboard.press('KeyF'); await page.waitForTimeout(700)
await snap('F-הרמה')
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500)
await snap('חץ')
await page.keyboard.press('KeyF'); await page.waitForTimeout(1200)
await snap('הנחה')
for (let round=0; round<8; round++){
  const st = await page.evaluate(()=>window.__ch1TableAt ? window.__ch1TableAt() : null)
  if (!st) break; const k=st.placed.findIndex(v=>!v); if(k<0) break
  let ok=false
  for (let t=0;t<3&&!ok;t++){ await page.keyboard.press('KeyF'); await page.waitForTimeout(600)
    for (let a=0;a<t;a++){ await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300) }
    await page.keyboard.press('KeyF'); await page.waitForTimeout(850)
    ok=(await page.evaluate(()=>window.__ch1TableAt())).placed[k] }
  if(!ok) break }
await snap('שולחן-מלא')
await page.keyboard.press('KeyE'); await page.waitForTimeout(1500)
await snap('פירוש')
const labels = await page.$$eval('.ch1-task-options button', els=>els.map(e=>e.textContent.trim()))
const right = labels.findIndex(l=>/הכתובת החקוקה מעידה/.test(l))
const bs = await page.$$('.ch1-task-options button'); if (right>=0 && bs[right]) { await bs[right].click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1500) }
await snap('אחרי-תשובה')
for (let k=0;k<10;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
await page.waitForTimeout(1500)
await snap('אחרי-סגירה')
await K.talk(); await page.waitForTimeout(1500)
await snap('סיכום')
for (let r=0;r<6;r++){ const held=await page.evaluate(()=>!!document.querySelector('.poi-gate-hold')); if(!held) break
  w=await K.W(); const p=await K.L(); const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
  await K.walk(c.x,c.z,2.2); await page.keyboard.press('KeyE'); await page.waitForTimeout(1200); await snap(`סיום-${r+1}`); await K.talk() }
await snap('סוף')
say('סרט:', await page.evaluate(()=>!!document.querySelector('.ch1-film, .hud-film, video')))
await browser.close()
