import { open } from './lib-probe.mjs'
const { browser, page } = await open('border-post')
const go = async (x, z) => page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const clear = async () => { for(let k=0;k<60;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) return; await page.keyboard.press('Space'); await page.waitForTimeout(180) } }
let w = await page.evaluate(()=>window.__ch1Where)
for (const c of w.cast){ await go(c.x,c.z+1.6); await page.waitForTimeout(900); await page.keyboard.press('KeyE'); await page.waitForTimeout(400); await clear() }
w = await page.evaluate(()=>window.__ch1Where)
for (const f of w.finds){ await go(f.x,f.z+1.0); await page.waitForTimeout(900);
  const nf = await page.evaluate(()=>window.__ch1Live.nearFind); console.log('at',f.id,'nearFind=',nf)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(600); await page.keyboard.press('Escape'); await page.waitForTimeout(300); await clear() }
w = await page.evaluate(()=>window.__ch1Where)
console.log('finds', JSON.stringify(w.finds))
await go(w.task.x, w.task.z+2.0); await page.waitForTimeout(3000)
const t = await page.evaluate(()=>window.__ch1Task)
console.log('task screen', JSON.stringify(t))
console.log('atTask', await page.evaluate(()=>window.__ch1Live.atTask))
await page.screenshot({ path: 'scratchpad/shots/glow/border-drag.png' })
await browser.close()
