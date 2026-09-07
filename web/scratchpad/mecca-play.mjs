/* מכה, בעכבר ומקלדת: שיחות הליבה, שלושת הממצאים, סידור שולחן הראיות
   בגרירה אמיתית, ואז שאלת הפירוש. */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
const dir = '/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/video/play-mecca'
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport:{width:1100,height:620}, recordVideo:{ dir, size:{width:1100,height:620} } })
const page = await ctx.newPage()
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0,160)))
page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('   [ניווט]') })
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Camera, null, { timeout:180000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)
const cx=140, cy=520
const L = async () => { await page.waitForFunction(()=>window.__ch1Live, null, {timeout:30000}).catch(()=>{})
  return page.evaluate(()=>window.__ch1Live?{x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}:{x:0,z:0,yaw:0}) }
const W = async () => { await page.waitForFunction(()=>window.__ch1Where, null, {timeout:60000}).catch(()=>{})
  return page.evaluate(()=>window.__ch1Where ?? { stage:'?', cast:[], finds:[], task:null }) }
const dlg = () => page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
const note = () => page.evaluate(()=>document.querySelector('.ch1-task-note')?.textContent?.trim() ?? '')
const project = (x,y,z) => page.evaluate(({x,y,z}) => {
  const v = new (window.__ch1Scene.position.constructor)(x,y,z); v.project(window.__ch1Camera)
  return { sx:(v.x*0.5+0.5)*window.innerWidth, sy:(-v.y*0.5+0.5)*window.innerHeight } }, {x,y,z})
async function talkOut(max=18){ for(let i=0;i<max;i++){ if(!(await dlg())) return
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(500); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(420) } }
async function turnTo(tx,tz){ const p=await L()
  const want = Math.PI - Math.atan2(tx-p.x, tz-p.z)
  let d = want - p.yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
  const px = Math.round(d/0.005); if (Math.abs(px)<6) return
  await page.mouse.move(cx,cy); await page.mouse.down()
  const st=Math.max(4,Math.min(30,Math.abs(px)/40))
  for(let i=1;i<=st;i++) await page.mouse.move(cx+(px*i)/st, cy)
  await page.mouse.up(); await page.waitForTimeout(220) }
let stuck = 0
async function walkTo(tx,tz,stop=2.0,budget=30){ for(let n=0;n<budget;n++){
  if (await dlg()) await talkOut()
  const p=await L(); const d=Math.hypot(tx-p.x,tz-p.z); if(d<=stop) return true
  await turnTo(tx,tz); await page.keyboard.down('KeyW'); await page.waitForTimeout(d>8?1400:620)
  await page.keyboard.up('KeyW'); await page.waitForTimeout(250)
  const q=await L()
  if (Math.hypot(q.x-p.x,q.z-p.z) < 0.12) { stuck++
    const side = stuck % 2 ? 'KeyA' : 'KeyD'
    await page.keyboard.down(side); await page.waitForTimeout(800); await page.keyboard.up(side)
    if (stuck % 3 === 0) { const pp=await L()
      await turnTo(pp.x + Math.sin(pp.yaw + 1.1) * 6, pp.z + Math.cos(pp.yaw + 1.1) * 6)
      await page.keyboard.down('KeyW'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW') } }
  else stuck = 0 }
  const p=await L(); return Math.hypot(tx-p.x,tz-p.z)<=stop+1.2 }

let w = await W()
console.log('פתיחה:', w.stage)
for (let r=0;r<10;r++){ w = await W(); if (w.stage!=='brief') break
  if (w.cast.length){ const p=await L()
    const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
    await walkTo(c.x,c.z,2.2); await talkOut()
    await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await talkOut() }
  else { await page.waitForTimeout(5000); await talkOut() } }
w = await W(); console.log('אחרי השיחה:', w.stage)

/* השולחן לפני שהוא רלוונטי */
const T = { x: w.task.x + 2.1, z: w.task.z + 1.3 }
await walkTo(T.x, T.z, 2.4)
/* גובה פני השולחן נמדד מן הרשת עצמה. `getWorldPosition` של הקבוצה
   מחזיר 0 — הילדים ממוקמים בקואורדינטות עולם — ולכן ההיטל היה שגוי
   והגרירה החטיאה. */
const topY = await page.evaluate(()=>{
  const o = window.__ch1Scene.getObjectByName('task:evidence-table')
  if (!o) return null
  let top = -1e9
  o.updateMatrixWorld(true)
  o.traverse(n => {
    if (!n.isMesh || !n.geometry?.attributes?.position) return
    const pos = n.geometry.attributes.position, m = n.matrixWorld.elements
    for (let i=0;i<pos.count;i+=Math.max(1,Math.ceil(pos.count/200))) {
      const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i)
      const wy = m[1]*x + m[5]*y + m[9]*z + m[13]
      if (wy > top) top = wy
    }
  })
  return top
})
console.log('שלב לפני נגיעה בשולחן:', (await W()).stage)

for (let guard=0; guard<8; guard++){ w = await W(); if (w.stage!=='look') break
  const f = w.finds.find(q=>!q.done); if(!f) break
  const got = await walkTo(f.x,f.z,1.7)
  console.log('   ממצא', f.id, got?'הגעתי':'לא הגעתי')
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1100)
  await page.keyboard.press('Escape'); await page.waitForTimeout(500); await talkOut() }
w = await W(); console.log('אחרי הממצאים:', w.stage, `(${w.finds.filter(f=>f.done).length}/${w.finds.length})`)

await walkTo(T.x, T.z + 2.2, 1.5)
await page.waitForTimeout(1500)
await page.screenshot({ path: '/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/mecca-table.png' })
const HOME = [0,1,2].map(i => ({ x: T.x + (i-1)*0.8, z: T.z + 0.36 }))
const SLOT = [{dx:-0.95},{dx:0},{dx:0.95}].map(s => ({ x: T.x + s.dx, z: T.z - 0.3 }))
const TOP = topY ?? 0
for (let i=0;i<3;i++){
  const a = await project(HOME[i].x, TOP + 0.15, HOME[i].z)
  const b = await project(SLOT[i].x, TOP + 0.15, SLOT[i].z)
  await page.mouse.move(a.sx, a.sy); await page.mouse.down()
  for (let k=1;k<=14;k++){ await page.mouse.move(a.sx+(b.sx-a.sx)*k/14, a.sy+(b.sy-a.sy)*k/14); await page.waitForTimeout(60) }
  await page.mouse.up(); await page.waitForTimeout(800)
  console.log('   הנחה', i, '→ שלב', (await W()).stage)
}
await page.screenshot({ path: '/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/mecca-placed.png' })
/* אם הגרירה לא נרשמה — מנסים את חלופת המקלדת, ומדווחים על שתיהן */
if ((await W()).stage === 'act') {
  console.log('   הגרירה לא נרשמה — בודקים את חלופת המקלדת (T)')
  await page.keyboard.press('KeyT'); await page.waitForTimeout(1400)
  console.log('   T פתח פאנל:', await page.evaluate(()=>!!document.querySelector('.ch1-task')))
  const labels = await page.$$eval('.ch1-task-hand button', els=>els.map(e=>e.textContent.trim()))
  console.log('   כפתורי הפעולה:', JSON.stringify(labels))
  for (let i=0;i<3;i++){
    const b = await page.$$('.ch1-task-hand button')
    const free = b.find ? null : null
    for (const el of b) { const dis = await el.isDisabled().catch(()=>true); if (!dis) { await el.click({timeout:3000}).catch(()=>{}); break } }
    await page.waitForTimeout(800)
    console.log('   כפתור', i, '→ שלב', (await W()).stage)
  }
  for (let k=0;k<12;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
}
w = await W(); console.log('אחרי השולחן:', w.stage)

if (w.stage === 'interpret') {
  await walkTo(w.task.x, w.task.z, 2.3)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1600)
  console.log('הפאנל נפתח:', await page.evaluate(()=>!!document.querySelector('.ch1-task')))
  const labels = await page.$$eval('.ch1-task-options button', els=>els.map(e=>e.textContent.trim()))
  console.log('   אפשרויות:', labels.length)
  const right = labels.findIndex(l=>/הכתובת החקוקה מעידה/.test(l))
  const bs = await page.$$('.ch1-task-options button')
  if (right>=0 && bs[right]) { await bs[right].click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(1800) }
  console.log('   נפתרה?', (await W()).task?.solved)
  for (let k=0;k<12;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  await talkOut()
}
await page.screenshot({ path: '/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/mecca-after.png' })
w = await W()
console.log('סוף:', w.stage, '| השער:', await page.evaluate(()=>!document.querySelector('.poi-gate-hold')) ? 'פתוח' : 'נעול')
if (errs.length) console.log('JS:', [...new Set(errs)].slice(0,2).join(' | '))
await ctx.close(); await browser.close()
const f = fs.readdirSync(dir).find(n=>n.endsWith('.webm'))
if (f) fs.renameSync(`${dir}/${f}`, `${dir}/play.webm`)
