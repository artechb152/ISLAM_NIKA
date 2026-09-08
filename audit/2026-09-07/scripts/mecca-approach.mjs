/* מכה: הגעה אל השולחן בניווט אמיתי (BFS על הקוליידרים), ואז F, שאלה, סיכום. */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page); const say=console.log
const routePoints = (tx,tz) => page.evaluate(({tx,tz})=>{
  const C=window.__ch1Statics, L=window.__ch1Live, R=0.5, STEP=0.5, LIM=70
  const free=(x,z)=>{for(const c of C) if(Math.hypot(c.x-x,c.z-z)<c.r+R) return false; return true}
  const k=(i,j)=>i+','+j
  const si=Math.round(L.player.x/STEP), sj=Math.round(L.player.z/STEP), ti=Math.round(tx/STEP), tj=Math.round(tz/STEP)
  const prev=new Map([[k(si,sj),null]]); const q=[[si,sj]]; let hit=null,best=1e9
  while(q.length){const [i,j]=q.shift(); const d=Math.hypot(i-ti,j-tj)
    if(d<best){best=d;hit=[i,j]} if(d<2.2){hit=[i,j];break}
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const ni=i+di,nj=j+dj; if(Math.abs(ni*STEP)>LIM||Math.abs(nj*STEP)>LIM) continue
      const key=k(ni,nj); if(prev.has(key)) continue; if(!free(ni*STEP,nj*STEP)) continue
      prev.set(key,k(i,j)); q.push([ni,nj]) } }
  if(!hit) return []
  const path=[]; let cur=k(hit[0],hit[1])
  while(cur){const [i,j]=cur.split(',').map(Number); path.push({x:i*STEP,z:j*STEP}); cur=prev.get(cur)}
  path.reverse(); const out=[]; for(let i=0;i<path.length;i+=5) out.push(path[i]); return out
}, {tx,tz})
const routeTo = async (tx,tz,stop) => { const pts = await routePoints(tx,tz); say('   נקודות מסלול:', pts.length)
  for (const pt of pts) { await K.walk(pt.x, pt.z, 1.4, 8); const p=await K.L(); if (Math.hypot(tx-p.x,tz-p.z)<=stop) return true }
  const p=await K.L(); return Math.hypot(tx-p.x,tz-p.z)<=stop }
await K.start('mecca')
let w=await K.W()
for (let r=0;r<12;r++){ const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  w=await K.W(); if (w.stage!=='brief' && !owed) break
  const p=await K.L(); const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
  await K.walk(c.x,c.z,2.2); await K.talk(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1000); await K.talk() }
for (let g=0;g<8;g++){ w=await K.W(); if(w.stage!=='look') break
  const f=w.finds.find(x=>!x.done); if(!f) break
  let ok=await K.walk(f.x,f.z,1.7); if(!ok) ok=await routeTo(f.x,f.z,1.7)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1100); await page.keyboard.press('Escape'); await page.waitForTimeout(400) }
w=await K.W(); say('שלב לפני השולחן:', w.stage)
/* היעד שהוכח כבר-הגעה בריצות הקודמות: 2.4 מ׳ לפני השולחן, עצירה ב-1.5 —
   כלומר 1–3 מ׳ מן המרכז, בתוך TASK_RANGE=3.0 */
/* ההליכה ב-headless היא כ-0.5 מ׳/שנ׳ — תקציב של 24 צעדים נגמר אחרי 7 מ׳ */
let got = await K.walk(w.task.x, w.task.z+2.0, 1.4, 70)
if (!got) got = await routeTo(w.task.x, w.task.z+2.0, 1.8)
for (let k=0; k<4 && !(await page.evaluate(()=>!!window.__ch1Live.atTask)); k++) {
  /* צעד קטן נוסף פנימה, עד שהתחנה בהישג יד */
  await K.turn(w.task.x, w.task.z); await page.keyboard.down('KeyW'); await page.waitForTimeout(350); await page.keyboard.up('KeyW'); await page.waitForTimeout(500) }
await page.waitForTimeout(4000)
const p=await K.L()
say('הגעה לשולחן:', got, '· מרחק', Math.hypot(p.x-w.task.x,p.z-w.task.z).toFixed(2), '· atTask', await page.evaluate(()=>!!window.__ch1Live.atTask), '· תקריב', await page.evaluate(()=>!!window.__ch1Live.taskFocus), '· fov', (await K.cam()).fov)
await page.screenshot({ path:`${OUT}/shots/v5-mecca-table.png` })
say('הוראת F על המסך:', JSON.stringify(await page.evaluate(()=>(document.querySelector('.hud-hand')?.textContent??'').trim().slice(0,70))))
for (let round=0; round<8; round++){
  const st = await page.evaluate(()=>window.__ch1TableAt ? window.__ch1TableAt() : null); if(!st) break
  const k=st.placed.findIndex(v=>!v); if(k<0) break
  let ok=false
  for (let t=0;t<3&&!ok;t++){ await page.keyboard.press('KeyF'); await page.waitForTimeout(600)
    for (let a=0;a<t;a++){ await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300) }
    if (t===0) await page.screenshot({ path:`${OUT}/shots/v5-mecca-hold-${k}.png` })
    await page.keyboard.press('KeyF'); await page.waitForTimeout(850)
    ok=(await page.evaluate(()=>window.__ch1TableAt())).placed[k] }
  say(`   מקור ${k}: ${ok?'הונח':'לא'}`); if(!ok) break }
await page.screenshot({ path:`${OUT}/shots/v5-mecca-full.png` })
say('אחרי השולחן:', (await K.W()).stage)
await page.keyboard.press('KeyE'); await page.waitForTimeout(1500)
say('הפאנל נפתח:', await page.evaluate(()=>!!document.querySelector('.ch1-task')))
await page.screenshot({ path:`${OUT}/shots/v5-mecca-question.png` })
const labels = await page.$$eval('.ch1-task-options button', els=>els.map(e=>e.textContent.trim()))
const right = labels.findIndex(l=>/הכתובת החקוקה מעידה/.test(l))
const bs = await page.$$('.ch1-task-options button'); if (right>=0 && bs[right]) { await bs[right].click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1500) }
say('נפתרה:', (await K.W()).task?.solved)
for (let k=0;k<10;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
await page.waitForTimeout(2500)
say('אחרי סגירה: שלב', (await K.W()).stage, '· fov', (await K.cam()).fov, '· תקריב', await page.evaluate(()=>!!window.__ch1Live.taskFocus))
await K.talk(); await page.waitForTimeout(1500)
for (let r=0;r<6;r++){ const held=await page.evaluate(()=>!!document.querySelector('.poi-gate-hold')); if(!held) break
  w=await K.W(); const pp=await K.L(); const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-pp.x,a.z-pp.z)-Math.hypot(b.x-pp.x,b.z-pp.z))[0]
  await K.walk(c.x,c.z,2.2); await page.keyboard.press('KeyE'); await page.waitForTimeout(1200); await K.talk() }
say('סוף: שלב', (await K.W()).stage, '· השער', await page.evaluate(()=>!document.querySelector('.poi-gate-hold')?'פתוח':'נעול'), '· סרט', await page.evaluate(()=>!!document.querySelector('.hud-dialogue.has-film, .ch1-film')))
await page.screenshot({ path:`${OUT}/shots/v5-mecca-end.png` })
await browser.close()
