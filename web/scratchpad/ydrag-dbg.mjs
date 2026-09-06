import { open } from './lib-probe.mjs'
const { browser, page } = await open('yathrib')
const go = async (x,z)=>page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const clear=async()=>{for(let k=0;k<60;k++){if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue'))))return;await page.keyboard.press('Space');await page.waitForTimeout(180)}}
let w=await page.evaluate(()=>window.__ch1Where)
for(const c of w.cast){await go(c.x,c.z+1.6);await page.waitForTimeout(900);await page.keyboard.press('KeyE');await page.waitForTimeout(400);await clear()}
w=await page.evaluate(()=>window.__ch1Where)
await go(w.task.x, w.task.z+2.0); await page.waitForTimeout(3200)
const t=await page.evaluate(()=>window.__ch1Task)
console.log('props', JSON.stringify(t.props.map(p=>({id:p.id,x:Math.round(p.x),y:Math.round(p.y)}))))
console.log('bins ', JSON.stringify(t.bins.map(b=>({id:b.id,x:Math.round(b.x),y:Math.round(b.y)}))))
const it=t.props[0], b=t.bins[0]
await page.mouse.move(it.x,it.y); await page.mouse.down(); await page.waitForTimeout(200)
console.log('after down, dragging =', await page.evaluate(()=>window.__ch1Task.dragging))
for(let s=1;s<=12;s++){ await page.mouse.move(it.x+(b.x-it.x)*s/12, it.y+(b.y-it.y)*s/12); await page.waitForTimeout(60) }
const mid=await page.evaluate(()=>window.__ch1Task)
console.log('while held, item screen =', JSON.stringify(mid.props.map(p=>({id:p.id,x:Math.round(p.x),y:Math.round(p.y)}))[0]), 'cursor at', Math.round(b.x), Math.round(b.y))
await page.screenshot({path:'scratchpad/shots/glow/yathrib-held.png'})
await page.mouse.up(); await page.waitForTimeout(1200)
const after=await page.evaluate(()=>window.__ch1Task)
console.log('after up:', JSON.stringify(after.props.map(p=>({id:p.id,x:Math.round(p.x),y:Math.round(p.y),placed:p.placed}))))
console.log('note:', await page.evaluate(()=>document.querySelector('.ch1-task-note')?.innerText?.slice(0,90)))
console.log('solved', (await page.evaluate(()=>window.__ch1Where)).task.solved)
await browser.close()
