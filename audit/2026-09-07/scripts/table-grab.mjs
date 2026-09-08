/* לחיצה בדיוק במקום שהרכיב עצמו מחשב לחפץ, אחרי הליכה טבעית אל השולחן. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1100,height:620} })
page.on('pageerror', e=>console.log('ERR', e.message.slice(0,140)))
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Live, null, { timeout:180000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)
const cx=140, cy=520
const L=()=>page.evaluate(()=>({x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}))
const dlg=()=>page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
const W=()=>page.evaluate(()=>window.__ch1Where)
async function talkOut(){for(let i=0;i<20;i++){if(!(await dlg()))return
  const b=await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if(b){await b.click({timeout:2500}).catch(()=>{});await page.waitForTimeout(450);continue}
  await page.keyboard.press('Space');await page.waitForTimeout(400)}}
async function turnTo(tx,tz){const p=await L()
  const want=Math.PI-Math.atan2(tx-p.x,tz-p.z); let d=want-p.yaw
  while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
  const px=Math.round(d/0.005); if(Math.abs(px)<6)return
  await page.mouse.move(cx,cy);await page.mouse.down()
  const st=Math.max(4,Math.min(30,Math.abs(px)/40))
  for(let i=1;i<=st;i++)await page.mouse.move(cx+(px*i)/st,cy)
  await page.mouse.up();await page.waitForTimeout(200)}
async function walkTo(tx,tz,stop=2.2,budget=34){for(let n=0;n<budget;n++){
  if(await dlg())await talkOut()
  const p=await L();const d=Math.hypot(tx-p.x,tz-p.z);if(d<=stop)return true
  await turnTo(tx,tz);await page.keyboard.down('KeyW');await page.waitForTimeout(d>8?1400:620)
  await page.keyboard.up('KeyW');await page.waitForTimeout(240)}return false}
let w=await W()
for(let r=0;r<12;r++){ w=await W()
  const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  if(w.stage!=='brief'&&!owed)break
  if(w.cast.length){const p=await L()
    const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
    await walkTo(c.x,c.z,2.2);await talkOut()
    await page.keyboard.press('KeyE');await page.waitForTimeout(900);await talkOut()}
  else{await page.waitForTimeout(4000);await talkOut()}}
for(let g=0;g<8;g++){ w=await W(); if(w.stage!=='look')break
  const f=w.finds.find(x=>!x.done);if(!f)break
  await walkTo(f.x,f.z,1.7);await page.keyboard.press('KeyE');await page.waitForTimeout(1000)
  await page.keyboard.press('Escape');await page.waitForTimeout(400)}
w=await W()
console.log('שלב לפני השולחן:', w.stage)
await walkTo(w.task.x+2.1, w.task.z+1.3+2.6, 1.8)
await page.waitForTimeout(3500)
const t0 = await page.evaluate(()=>window.__ch1TableAt ? window.__ch1TableAt() : null)
console.log('מצב השולחן:', JSON.stringify(t0))
if (!t0) { console.log('אין וו מכשור'); await browser.close(); process.exit(0) }
/* F: מרימים, ואז מנסים שקע אחר שקע עד שההנחה נרשמת — בדיוק כמו לומד */
for (let round=0; round<8; round++){
  const st = await page.evaluate(()=>window.__ch1TableAt())
  const k = st.placed.findIndex(v=>!v); if (k<0) break
  let placedIt = false
  for (let t=0; t<3 && !placedIt; t++){
    await page.keyboard.press('KeyF'); await page.waitForTimeout(650)
    const held = await page.evaluate(()=>window.__ch1TableAt().drag)
    if (held < 0) break
    for (let a=0; a<t; a++){ await page.keyboard.press('ArrowRight'); await page.waitForTimeout(350) }
    const hand = await page.evaluate(()=>(document.querySelector('.hud-hand')?.textContent??'').trim().slice(0,70))
    await page.keyboard.press('KeyF'); await page.waitForTimeout(850)
    const a2 = await page.evaluate(()=>window.__ch1TableAt())
    placedIt = a2.placed[k]
    console.log(`   מקור ${k} · ניסיון ${t+1}: ${placedIt?'הונח':'חזר'} · "${hand}"`)
  }
  if (!placedIt) break
}
const fin = await page.evaluate(()=>window.__ch1TableAt())
console.log('placed:', JSON.stringify(fin.placed))
console.log('סוף · שלב:', (await W()).stage)
await browser.close()
