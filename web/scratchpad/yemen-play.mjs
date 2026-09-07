/* תימן, בעכבר ומקלדת בלבד: הליכה, E על האבן בעודה בצל, גרירת הלפיד
   אליה ביד, קריאה, ואז השאלה — כולל ניסיון לבחור תשובה שגויה. */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
/* ההקלטה נכתבת מחוץ לפרויקט. Playwright כותב את קובץ הווידאו כל
   הזמן, ושרת הפיתוח צופה ב-web/ — כך שכל ריצה מוקלטת גרמה
   לקומפילציה מחדש ולרענון מלא של הדף, באמצע המשחק. */
const dir = '/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/video/play-yemen'
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport:{width:1100,height:620}, recordVideo:{ dir, size:{width:1100,height:620} } })
const page = await ctx.newPage()
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0,160)))
page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('   [ניווט]', f.url().slice(-60)) })
await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Camera, null, { timeout:180000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)

const cx = 550, cy = 310
const live = async () => {
  await page.waitForFunction(()=>window.__ch1Live, null, { timeout: 30000 }).catch(()=>{})
  return page.evaluate(()=>window.__ch1Live
    ? { x:window.__ch1Live.player.x, z:window.__ch1Live.player.z, yaw:window.__ch1Live.yaw }
    : { x:0, z:0, yaw:0 })
}
const W = async () => { await page.waitForFunction(()=>window.__ch1Where, null, {timeout:60000}).catch(()=>{})
  return page.evaluate(()=>window.__ch1Where ?? { stage:'?', cast:[], finds:[], task:null }) }
const dlg = () => page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
const note = () => page.evaluate(()=>document.querySelector('.ch1-task-note')?.textContent?.trim() ?? '')
const project = (x,y,z) => page.evaluate(({x,y,z}) => {
  const c = window.__ch1Camera
  const v = new (window.__ch1Scene.position.constructor)(x,y,z)
  v.project(c)
  return { sx: (v.x*0.5+0.5)*window.innerWidth, sy: (-v.y*0.5+0.5)*window.innerHeight }
}, {x,y,z})
async function talkOut(max=14){ for(let i=0;i<max;i++){ if(!(await dlg())) return
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(500); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(420) } }
async function turnTo(tx,tz){ const p=await live()
  const want = Math.PI - Math.atan2(tx-p.x, tz-p.z)
  let d = want - p.yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
  const px = Math.round(d/0.005); if (Math.abs(px)<6) return
  await page.mouse.move(cx,cy); await page.mouse.down()
  const st = Math.max(4, Math.min(30, Math.abs(px)/40))
  for(let i=1;i<=st;i++) await page.mouse.move(cx+(px*i)/st, cy)
  await page.mouse.up(); await page.waitForTimeout(220) }
async function walkTo(tx,tz,stop=2.0,budget=26){ for(let n=0;n<budget;n++){
  if (await dlg()) await talkOut()
  const p=await live(); const d=Math.hypot(tx-p.x,tz-p.z); if(d<=stop) return true
  await turnTo(tx,tz); await page.keyboard.down('KeyW'); await page.waitForTimeout(d>8?1400:620)
  await page.keyboard.up('KeyW'); await page.waitForTimeout(260) }
  const p=await live(); return Math.hypot(tx-p.x,tz-p.z)<=stop+1.2 }

let w = await W()
console.log('פתיחה בשלב', w.stage)
for (let r=0;r<8;r++){ w = await W(); if (w.stage!=='brief') break
  if (w.cast.length){ const c=w.cast[0]; await walkTo(c.x,c.z,2.2); await talkOut()
    await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await talkOut() }
  else { await page.waitForTimeout(5000); await talkOut() } }
w = await W(); console.log('אחרי השיחה:', w.stage)

const T = { x: w.task.x, z: w.task.z }
const fd0 = w.finds[0]
await walkTo(fd0.x, fd0.z, 1.7)
console.log('1. E על האבן בעודה בצל:')
console.log('   קרוב אל:', JSON.stringify(await page.evaluate(()=>({
  find: window.__ch1Live.nearFind ?? null, d: +(window.__ch1Live.nearFindD ?? -1).toFixed(1),
  task: !!window.__ch1Live.atTask, who: window.__ch1Live.nearWho ?? null }))))
await page.keyboard.press('KeyE'); await page.waitForTimeout(1200)
console.log('   ההודעה:', JSON.stringify(await note()))
console.log('   פאנל נפתח:', await page.evaluate(()=>!!document.querySelector('.ch1-task')))
await page.screenshot({ path:'/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/shots/yemen-notyet.png' })

console.log('2. גרירת הלפיד אל האבן, בעכבר:')
/* הלפיד עצמו בסצנה בשם task:lamp — לוקחים ממנו מיקום אמיתי */
const lamp = await page.evaluate(()=>{
  const o = window.__ch1Scene.getObjectByName('task:lamp')
  if (!o) return null
  const v = o.getWorldPosition(new o.position.constructor())
  return { x: v.x, y: v.y, z: v.z }
})
console.log('   הלפיד:', JSON.stringify(lamp))
const a = await project(lamp.x, lamp.y + 0.6, lamp.z)
const bY = await page.evaluate(()=>{
  const o = window.__ch1Scene.getObjectByName('task:lamp')
  return o ? o.getWorldPosition(new o.position.constructor()).y : 0 })
const b = await project(T.x + 0.55, bY + 0.6, T.z + 0.35)
await page.mouse.move(a.sx, a.sy); await page.mouse.down()
for (let i=1;i<=18;i++){ await page.mouse.move(a.sx+(b.sx-a.sx)*i/18, a.sy+(b.sy-a.sy)*i/18); await page.waitForTimeout(70) }
await page.waitForTimeout(3200)
await page.mouse.up(); await page.waitForTimeout(900)
w = await W(); console.log('   אחרי הגרירה:', w.stage)
await page.screenshot({ path:'/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/shots/yemen-lit.png' })

if (w.stage === 'look') {
  const f = w.finds.find(q=>!q.done)
  if (f) { await walkTo(f.x, f.z, 1.7); await page.keyboard.press('KeyE'); await page.waitForTimeout(1100)
    await page.keyboard.press('Escape'); await page.waitForTimeout(500) }
}
w = await W(); console.log('3. אחרי קריאת האבן:', w.stage)

if (w.stage === 'interpret') {
  await walkTo(T.x, T.z, 2.3)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1600)
  console.log('4. הפאנל נפתח:', await page.evaluate(()=>!!document.querySelector('.ch1-task')))
  const btns = await page.$$('.ch1-task-options button')
  console.log('   אפשרויות בפאנל:', btns.length)
  // תשובה שגויה קודם
  const labels = await page.$$eval('.ch1-task-options button', els=>els.map(e=>e.textContent.trim()))
  const wrongIdx = labels.findIndex(l=>/כל מה שמסופר|אי אפשר לדעת/.test(l))
  if (wrongIdx >= 0) {
    await btns[wrongIdx].click({timeout:4000}).catch(()=>{})
    await page.waitForTimeout(1200)
    const taken = await page.$$eval('.ch1-task-options button', els=>els.map(e=>e.className.includes('is-taken')))
    console.log('   אחרי תשובה שגויה — נרשמה?', taken[wrongIdx], '| נפתרה?', (await W()).task?.solved)
    console.log('   הנימוק:', JSON.stringify((await note()).slice(0,90)))
  }
  const rightIdx = labels.findIndex(l=>/שבנו, עיבדו וכתבו/.test(l))
  const b2 = await page.$$('.ch1-task-options button')
  if (rightIdx >= 0 && b2[rightIdx]) { await b2[rightIdx].click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(1600) }
  console.log('   אחרי התשובה הנכונה — נפתרה?', (await W()).task?.solved)
  await page.screenshot({ path:'/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/shots/yemen-solved.png' })
  for (let k=0;k<12;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  await talkOut()
}
w = await W(); console.log('5. שלב:', w.stage, '| השער:', await page.evaluate(()=>!document.querySelector('.poi-gate-hold')) ? 'פתוח' : 'נעול')
if (errs.length) console.log('JS:', [...new Set(errs)].slice(0,2).join(' | '))
await ctx.close(); await browser.close()
const f = fs.readdirSync(dir).find(n=>n.endsWith('.webm'))
if (f) { fs.renameSync(`${dir}/${f}`, `${dir}/play.webm`); console.log('וידאו:', `${dir}/play.webm`) }
