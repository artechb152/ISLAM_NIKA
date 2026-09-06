import { open } from './lib-probe.mjs'
const { browser, page } = await open('monastery')
const go=async(x,z)=>page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const clear=async()=>{for(let k=0;k<60;k++){if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue'))))return;await page.keyboard.press('Space');await page.waitForTimeout(180)}}
const inward=(x,z,d=1.1)=>{const m=Math.hypot(x,z)||1;return [x-(x/m)*d, z-(z/m)*d]}
let w=await page.evaluate(()=>window.__ch1Where)
for(const c of w.cast){await go(c.x,c.z+1.6);await page.waitForTimeout(900);await page.keyboard.press('KeyE');await page.waitForTimeout(400);await clear()}
w=await page.evaluate(()=>window.__ch1Where)
for(const f of w.finds){await go(...inward(f.x,f.z));await page.waitForTimeout(800);
 for(let k=0;k<3;k++){const st=await page.evaluate((id)=>window.__ch1Where.finds.find(q=>q.id===id)?.done,f.id); if(st)break; await page.keyboard.press('KeyE');await page.waitForTimeout(700);await page.keyboard.press('Escape');await page.waitForTimeout(300);await clear()}}
w=await page.evaluate(()=>window.__ch1Where)
await go(w.task.x, w.task.z+2.2); await page.waitForTimeout(7000)
for (let n=0;n<4;n++){
  const t=await page.evaluate(()=>window.__ch1Task)
  console.log('props', JSON.stringify(t.props.map(p=>({id:p.id,x:Math.round(p.x),y:Math.round(p.y),placed:p.placed}))))
  console.log('bins ', JSON.stringify(t.bins.map(b=>({id:b.id,x:Math.round(b.x),y:Math.round(b.y)}))))
  console.log('flags', JSON.stringify({armed:t.armed,sortLocked:t.sortLocked,solvedTask:t.solvedTask,sortMode:t.sortMode,needs:t.needs,foundIn:t.foundIn}))
  const target = t.props.find(p=>!p.placed)
  if (target) console.log('under target:', await page.evaluate((p)=>{const e=document.elementFromPoint(p.x,p.y);return e?e.outerHTML.slice(0,160):'none'}, target))
  const it=t.props.find(p=>!p.placed); if(!it){console.log('all placed');break}
  const b=t.bins[0]
  await page.mouse.move(it.x,it.y); await page.mouse.down(); await page.waitForTimeout(400)
  console.log('dragging=', await page.evaluate(()=>window.__ch1Task.dragging), 'grabbing', it.id)
  for(let s=1;s<=12;s++){ await page.mouse.move(it.x+(b.x-it.x)*s/12, it.y+(b.y-it.y)*s/12); await page.waitForTimeout(70) }
  await page.mouse.up(); await page.waitForTimeout(1600)
  const a=await page.evaluate(()=>window.__ch1Task)
  console.log('  → placed:', a.props.find(p=>p.id===it.id)?.placed, '| note:', (await page.evaluate(()=>document.querySelector('.ch1-task-note')?.innerText?.replace(/\n/g,' ')?.slice(0,70))))
}
await browser.close()
