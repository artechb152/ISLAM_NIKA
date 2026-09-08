/* מה בדיוק חסר בית'רב: אילו שיחות ליבה נשמעו, ומה E מציע בכל לחיצה. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1000,height:600} })
await page.goto('http://localhost:3000/chapter1?region=yathrib', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Live, null, { timeout:180000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)
const seen = () => page.evaluate(()=>{ try { return JSON.parse(localStorage.getItem('ch1:notebook:v1')||'{}').seen ?? [] } catch { return [] } })
const dlgId = () => page.evaluate(()=>(document.querySelector('.hud-dialogue .hud-title, .hud-dialogue-eyebrow, .hud-dialogue b')?.textContent ?? '').trim().slice(0,40))
const dlgText = () => page.evaluate(()=>(document.querySelector('.hud-dialogue')?.innerText ?? '').replace(/\s+/g,' ').slice(0,90))
const dlg = () => page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
async function talkOut(){ for(let i=0;i<22;i++){ if(!(await dlg())) return
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(450); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(400) } }
const cx=140, cy=520
const L = () => page.evaluate(()=>({x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}))
async function turnTo(tx,tz){ const p=await L()
  const want = Math.PI - Math.atan2(tx-p.x, tz-p.z)
  let d = want - p.yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
  const px = Math.round(d/0.005); if (Math.abs(px)<6) return
  await page.mouse.move(cx,cy); await page.mouse.down()
  const st=Math.max(4,Math.min(30,Math.abs(px)/40))
  for(let i=1;i<=st;i++) await page.mouse.move(cx+(px*i)/st, cy)
  await page.mouse.up(); await page.waitForTimeout(200) }
async function walkTo(tx,tz,stop=2.0,budget=26){ for(let n=0;n<budget;n++){
  if (await dlg()) await talkOut()
  const p=await L(); const d=Math.hypot(tx-p.x,tz-p.z); if(d<=stop) return true
  await turnTo(tx,tz); await page.keyboard.down('KeyW'); await page.waitForTimeout(d>8?1400:620)
  await page.keyboard.up('KeyW'); await page.waitForTimeout(240) }
  return false }
const W = await page.evaluate(()=>window.__ch1Where)
const c = W.cast[0]
await talkOut()
for (let i=0;i<9;i++){
  await walkTo(c.x, c.z, 2.2)
  const before = await seen()
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1100)
  const opened = await dlg()
  const txt = opened ? await dlgText() : ''
  await talkOut()
  const after = await seen()
  const fresh = after.filter(x=>!before.includes(x))
  console.log(`E #${i+1}: ${opened?'נפתחה':'לא נפתחה'} · חדש: ${JSON.stringify(fresh)} · "${txt}"`)
  if (!opened) break
}
console.log('נשמעו:', JSON.stringify(await seen()))
console.log('ליבה חסרה:', await page.evaluate(()=>{
  const el=[...document.querySelectorAll('.poi-gate-hold')]; return el.length ? 'השער מוחזק' : 'השער פתוח' }))
console.log('שלב:', await page.evaluate(()=>window.__ch1Where.stage))
await browser.close()
