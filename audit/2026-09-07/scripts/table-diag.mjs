/* שולחן הראיות במכה: האם ההנחה בגרירה נרשמת, ואיפה החפצים על המסך. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1100,height:620} })
page.on('pageerror', e=>console.log('ERR', e.message.slice(0,140)))
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Camera && window.__ch1Scene, null, { timeout:180000 })
await page.waitForTimeout(9000)
const T = await page.evaluate(()=>{ const t=window.__ch1Where.task; return { x:t.x+2.1, z:t.z+1.3 } })
/* מציבים את השחקן ליד השולחן — [מסייעת], רק כדי לבודד את הגרירה */
await page.evaluate((T)=>{ window.__ch1Live.player.x = T.x; window.__ch1Live.player.z = T.z + 3.2; window.__ch1Live.yaw = Math.PI }, T)
await page.waitForTimeout(2500)
const info = await page.evaluate((T)=>{
  const o = window.__ch1Scene.getObjectByName('task:evidence-table')
  const cam = window.__ch1Camera
  const V = window.__ch1Scene.position.constructor
  const proj = (x,y,z) => { const v=new V(x,y,z); v.project(cam); return { sx:Math.round((v.x*0.5+0.5)*innerWidth), sy:Math.round((-v.y*0.5+0.5)*innerHeight), z:+v.z.toFixed(2) } }
  const top = o ? o.getWorldPosition(new V()).y : 0
  const homes = [0,1,2].map(i=>({ x: T.x + (i-1)*0.8, z: T.z + 0.36 }))
  const slots = [-0.95,0,0.95].map(dx=>({ x: T.x + dx, z: T.z - 0.3 }))
  return { table: !!o, top: +top.toFixed(2), stage: window.__ch1Where.stage,
    homes: homes.map(h=>proj(h.x, top+0.15, h.z)), slots: slots.map(s=>proj(s.x, top+0.15, s.z)) }
}, T)
console.log('שולחן בסצנה:', info.table, '· גובה', info.top, '· שלב', info.stage)
console.log('חפצים על המסך:', JSON.stringify(info.homes))
console.log('שקעים על המסך:', JSON.stringify(info.slots))
await page.screenshot({ path: `${OUT}/shots/mecca-table-diag.png` })
for (let i=0;i<3;i++){
  const a = info.homes[i], b = info.slots[i]
  await page.mouse.move(a.sx, a.sy); await page.mouse.down()
  for (let k=1;k<=14;k++){ await page.mouse.move(a.sx+(b.sx-a.sx)*k/14, a.sy+(b.sy-a.sy)*k/14); await page.waitForTimeout(60) }
  await page.mouse.up(); await page.waitForTimeout(800)
  console.log(`גרירה ${i}: מ-${a.sx},${a.sy} אל ${b.sx},${b.sy} → שלב ${await page.evaluate(()=>window.__ch1Where.stage)}`)
}
await page.screenshot({ path: `${OUT}/shots/mecca-table-after.png` })
/* ואז חלופת המקלדת */
await page.keyboard.press('KeyT'); await page.waitForTimeout(1200)
console.log('T פתח פאנל:', await page.evaluate(()=>!!document.querySelector('.ch1-task')))
const btns = await page.$$eval('.ch1-task-hand button', els=>els.map(e=>e.textContent.trim()))
console.log('כפתורי הפעולה:', JSON.stringify(btns))
for (let i=0;i<3;i++){ const b = await page.$$('.ch1-task-hand button'); if (b[i]) { await b[i].click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(700) } }
console.log('אחרי הכפתורים → שלב', await page.evaluate(()=>window.__ch1Where.stage))
await page.screenshot({ path: `${OUT}/shots/mecca-table-keyboard.png` })
await browser.close()
