/* מעבר מלא שבו הפעולה הפיזית נעשית במקלדת בלבד: F מרים, החצים בוחרים
   יעד, F מניח, Esc מבטל. בלי גרירת עכבר על חפצים — העכבר משמש רק
   לסיבוב המבט, כמו אצל שחקן. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const region = process.argv[2]
const OUT = '/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const dir = `/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/video/f-${region}`
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport:{width:1100,height:620}, recordVideo:{ dir, size:{width:1100,height:620} } })
const page = await ctx.newPage()
const errs=[]; page.on('pageerror', e=>errs.push(e.message.slice(0,160)))
const say=(m)=>console.log(m)
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Live, null, { timeout:180000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)
const cx=140, cy=520
const L = async () => { await page.waitForFunction(()=>window.__ch1Live, null, {timeout:30000}).catch(()=>{})
  return page.evaluate(()=>window.__ch1Live?{x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}:{x:0,z:0,yaw:0}) }
const W = async () => { await page.waitForFunction(()=>window.__ch1Where, null, {timeout:60000}).catch(()=>{})
  return page.evaluate(()=>window.__ch1Where ?? {stage:'?',cast:[],finds:[],task:null}) }
const dlg = () => page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
const handLine = () => page.evaluate(()=>(document.querySelector('.hud-hand')?.textContent ?? '').trim().slice(0,120))
const taskState = () => page.evaluate(()=>window.__ch1Task ? window.__ch1Task.props?.map(p=>({id:p.id, placed:p.placed})) : null)
async function talkOut(max=20){ for(let i=0;i<max;i++){ if(!(await dlg())) return
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(480); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(400) } }
async function turnTo(tx,tz){ const p=await L()
  const want = Math.PI - Math.atan2(tx-p.x, tz-p.z)
  let d = want - p.yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
  const px = Math.round(d/0.005); if (Math.abs(px)<6) return
  await page.mouse.move(cx,cy); await page.mouse.down()
  const st=Math.max(4,Math.min(30,Math.abs(px)/40))
  for(let i=1;i<=st;i++) await page.mouse.move(cx+(px*i)/st, cy)
  await page.mouse.up(); await page.waitForTimeout(200) }
let stuck=0
async function walkTo(tx,tz,stop=2.0,budget=26){ for(let n=0;n<budget;n++){
  if (await dlg()) await talkOut()
  const p=await L(); const d=Math.hypot(tx-p.x,tz-p.z); if(d<=stop) return true
  await turnTo(tx,tz); await page.keyboard.down('KeyW'); await page.waitForTimeout(d>8?1400:620)
  await page.keyboard.up('KeyW'); await page.waitForTimeout(240)
  const q=await L()
  if (Math.hypot(q.x-p.x,q.z-p.z)<0.12){ stuck++
    const side = stuck%2 ? 'KeyA':'KeyD'
    await page.keyboard.down(side); await page.waitForTimeout(800); await page.keyboard.up(side) } else stuck=0 }
  const p=await L(); return Math.hypot(tx-p.x,tz-p.z)<=stop+1.2 }
const routePoints = async (tx,tz) => page.evaluate(({tx,tz})=>{
  const C=window.__ch1Statics, L=window.__ch1Live, R=0.5, STEP=0.5, LIM=70
  const free=(x,z)=>{for(const c of C) if(Math.hypot(c.x-x,c.z-z)<c.r+R) return false; return true}
  const k=(i,j)=>i+','+j
  const si=Math.round(L.player.x/STEP), sj=Math.round(L.player.z/STEP)
  const ti=Math.round(tx/STEP), tj=Math.round(tz/STEP)
  const prev=new Map([[k(si,sj),null]]); const q=[[si,sj]]; let hit=null,best=1e9
  while(q.length){const [i,j]=q.shift(); const d=Math.hypot(i-ti,j-tj)
    if(d<best){best=d;hit=[i,j]} if(d<1.5){hit=[i,j];break}
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const ni=i+di,nj=j+dj; if(Math.abs(ni*STEP)>LIM||Math.abs(nj*STEP)>LIM) continue
      const key=k(ni,nj); if(prev.has(key)) continue; if(!free(ni*STEP,nj*STEP)) continue
      prev.set(key,k(i,j)); q.push([ni,nj]) } }
  if(!hit) return []
  const path=[]; let cur=k(hit[0],hit[1])
  while(cur){const [i,j]=cur.split(',').map(Number); path.push({x:i*STEP,z:j*STEP}); cur=prev.get(cur)}
  path.reverse(); const out=[]; for(let i=0;i<path.length;i+=6) out.push(path[i]); out.push({x:tx,z:tz}); return out
}, {tx,tz})
async function routeTo(tx,tz,stop=2.0){ const pts=await routePoints(tx,tz); if(!pts.length) return false
  for(const pt of pts){ await walkTo(pt.x,pt.z,1.6,8); const p=await L(); if(Math.hypot(tx-p.x,tz-p.z)<=stop) return true }
  const p=await L(); return Math.hypot(tx-p.x,tz-p.z)<=stop+1.0 }

let w = await W()
say(`== ${region} · פתיחה: ${w.stage} · [מקלדת בלבד לפעולה]`)
for (let r=0;r<14;r++){ w=await W()
  const owed = await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent ?? ''))
  if (w.stage!=='brief' && !owed) break
  if (w.cast.length){ const p=await L()
    const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
    let got=await walkTo(c.x,c.z,2.2); if(!got) got=await routeTo(c.x,c.z,2.2)
    await talkOut(); await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await talkOut() }
  else { await page.waitForTimeout(5000); await talkOut() } }
say(`   אחרי השיחות: ${(await W()).stage}`)

for (let g=0;g<10;g++){ w=await W(); if(w.stage!=='look') break
  const f=w.finds.find(q=>!q.done); if(!f) break
  let got=await walkTo(f.x,f.z,1.7); if(!got) got=await routeTo(f.x,f.z,1.7)
  say(`   עדות ${f.id}: ${got?'הגעתי':'לא הגעתי'}`)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1100)
  await page.keyboard.press('Escape'); await page.waitForTimeout(450); await talkOut() }
w=await W(); say(`   אחרי העדויות: ${w.stage} (${w.finds.filter(f=>f.done).length}/${w.finds.length})`)

/* הפעולה — במקלדת */
if (w.task) {
  let got = await walkTo(w.task.x, w.task.z, 2.3); if(!got) got = await routeTo(w.task.x, w.task.z, 2.3)
  say(`   הליכה אל התחנה: ${got?'הגעתי':'לא הצלחתי'}`)
  await page.waitForTimeout(4000)
  say(`   הוראה על המסך: "${await handLine()}"`)
  await page.screenshot({ path: `${OUT}/shots/f-${region}-before.png` })
  for (let round=0; round<24; round++) {
    const before = await taskState()
    if (!before || !before.some(p=>!p.placed)) break
    await page.keyboard.press('KeyF'); await page.waitForTimeout(700)
    const line = await handLine()
    if (round === 0) say(`   אחרי F הראשון: "${line}"`)
    /* מנסים יעד אחר יעד עד שההנחה נרשמת */
    /* היעד מתאפס בכל הרמה, ולכן בניסיון ה-t לוחצים t חצים — אחרת
       לעולם לא מגיעים ליעד השלישי. */
    let placedNow = false
    for (let t=0; t<5 && !placedNow; t++) {
      if (t > 0) {
        await page.keyboard.press('KeyF'); await page.waitForTimeout(550)
        for (let a=0; a<t; a++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(320) }
      }
      await page.keyboard.press('KeyF'); await page.waitForTimeout(900)
      const after = await taskState()
      placedNow = !!after && after.filter(p=>p.placed).length > before.filter(p=>p.placed).length
      if (!placedNow) { await page.keyboard.press('KeyF'); await page.waitForTimeout(400) }
    }
    const after = await taskState()
    say(`   סבב ${round}: ${JSON.stringify(after)}`)
    if (!placedNow && round > 6) break
  }
  await page.screenshot({ path: `${OUT}/shots/f-${region}-after.png` })
}
w=await W(); say(`   אחרי הפעולה: ${w.stage}`)
if (w.stage === 'interpret') {
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1300)
  for (let k=0;k<6;k++){ const b=await page.$$('.ch1-task-interpret button'); if(!b.length) break
    await b[k%b.length].click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(1100)
    if ((await W()).task?.solved) break }
  for (let k=0;k<12;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  await talkOut() }
w=await W(); say(`   אחרי הפירוש: ${w.stage}`)
for (let round=0; round<8; round++){
  const held = await page.evaluate(()=>!!document.querySelector('.poi-gate-hold')); if(!held) break
  w=await W(); if(!w.cast.length) break
  const p=await L(); const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
  let got=await walkTo(c.x,c.z,2.2); if(!got) got=await routeTo(c.x,c.z,2.2)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
  const spoke = await dlg(); await talkOut(20)
  say(`   שיחת סיום עם ${c.who}: ${got?(spoke?'דיברנו':'לא נפתחה'):'לא הגעתי'}`)
  if(!got||!spoke) break }
const open = await page.evaluate(()=>!document.querySelector('.poi-gate-hold'))
say(`   השער: ${open?'פתוח':'עדיין נעול'}`)
if (w.gate && open) { await routeTo(w.gate.x, w.gate.z, 1.4)
  await page.waitForTimeout(5000)
  say(`   עברתי אל: ${await page.evaluate(()=>window.__ch1Where?.region)}`) }
await page.screenshot({ path: `${OUT}/shots/f-${region}-end.png` })
if (errs.length) say('JS: ' + [...new Set(errs)].slice(0,3).join(' | '))
await ctx.close(); await browser.close()
const f = fs.readdirSync(dir).find(n=>n.endsWith('.webm'))
if (f) { fs.renameSync(`${dir}/${f}`, `${dir}/play.webm`); fs.copyFileSync(`${dir}/play.webm`, `${OUT}/video/f-${region}.webm`); say(`   וידאו: ${OUT}/video/f-${region}.webm`) }
