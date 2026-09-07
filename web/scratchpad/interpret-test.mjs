/* מוכיח את הרצף: פעולה → פירוש → סיכום. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page, errors } = await open(region)
const go = async (x,z)=>page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const W = async () => { await page.waitForFunction(()=>window.__ch1Where,null,{timeout:90000}).catch(()=>{}); return page.evaluate(()=>window.__ch1Where) }
const clear = async () => { for(let k=0;k<50;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) return; await page.keyboard.press('Space'); await page.waitForTimeout(180) } }
const inward=(x,z,d=1.1)=>{const m=Math.hypot(x,z)||1;return [x-(x/m)*d, z-(z/m)*d]}
let w = await W()
console.log(`== ${region}: ${w.stage}`)
for (const c of w.cast){ await go(c.x,c.z+1.7); await page.waitForTimeout(1300)
  for(let k=0;k<6;k++){ await clear(); await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
    if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) break; await clear() } }
for(let i=0;i<8;i++){ w=await W(); if(w.stage!=='brief') break; await clear(); await page.keyboard.press('KeyR'); await page.waitForTimeout(700); await clear() }
w = await W()
for (const f of w.finds){ if(f.done) continue
  await go(...inward(f.x,f.z)); await page.waitForTimeout(900)
  if((await W()).region!==region) break
  for(let k=0;k<3;k++){ const st=(await W()).finds.find(q=>q.id===f.id)?.done; if(st)break
    await clear(); await page.keyboard.press('KeyE'); await page.waitForTimeout(700); await page.keyboard.press('Escape'); await page.waitForTimeout(250); await clear() } }
w = await W(); console.log(`   אחרי עדויות: ${w.stage}`)
// הפעולה
if (w.task){
  await go(w.task.x, w.task.z+2.0); await page.waitForTimeout(6500)
  /* מכה: הפעולה הפיזית היא שולחן הראיות, מערכת נפרדת מגרירת המשימה */
  await page.evaluate(() => { const W = window; if (W.__ch1TablePut) { W.__ch1TablePut(0); W.__ch1TablePut(1); W.__ch1TablePut(2) } })
  await page.waitForTimeout(2500)
  for (let round=0; round<10; round++){
    const t = await page.evaluate(()=>window.__ch1Task); if(!t) break
    const item = t.props.find(p=>!p.placed); if(!item) break
    const zones = t.bins?.length ? t.bins : [t.target]
    let ok=false
    for (const b of zones){
      await page.waitForTimeout(1200)
      const snap=await page.evaluate(()=>window.__ch1Task); const fresh=snap?.props?.find(p=>p.id===item.id)
      if(fresh){item.x=fresh.x;item.y=fresh.y}
      await page.mouse.move(item.x,item.y); await page.mouse.down()
      for(let s=1;s<=10;s++){ await page.mouse.move(item.x+(b.x-item.x)*s/10, item.y+(b.y-item.y)*s/10); await page.waitForTimeout(45) }
      await page.mouse.up(); await page.waitForTimeout(1300)
      const s2=await page.evaluate(()=>window.__ch1Task)
      if(s2?.props?.find(p=>p.id===item.id)?.placed){ ok=true; break }
    }
    if(!ok) break
  }
  w = await W(); console.log(`   אחרי הפעולה: ${w.stage}  (solved=${w.task.solved})`)
  // הפירוש
  if (w.stage === 'interpret'){
    await page.keyboard.press('KeyE'); await page.waitForTimeout(1200)
    const q = await page.evaluate(()=>document.querySelector('.ch1-task-question.is-interpret')?.innerText ?? null)
    console.log(`   שאלת הפירוש: ${q ? '"'+q.slice(0,58)+'…"' : 'לא נפתחה'}`)
    for (let k=0;k<5;k++){
      const btns = await page.$$('.ch1-task-interpret button')
      if(!btns.length) break
      await btns[k % btns.length].click({timeout:4000}).catch(()=>{})
      await page.waitForTimeout(1100)
      if ((await W()).task.solved) break
    }
    w = await W(); console.log(`   אחרי הפירוש: ${w.stage}  (solved=${w.task.solved})`)
  }
}
if (errors.length) console.log('   JS:', [...new Set(errors)].slice(0,2))
await browser.close()
