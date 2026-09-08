/* המעבר הצר: האם שתי הראיות נמסרות בפועל, או שהן נספרות כמונחות
   בלי שהיד נגעה בהן. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1000,height:600} })
await page.goto('http://localhost:3000/chapter1?region=narrow-pass', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Live, null, { timeout:180000 })
await page.waitForTimeout(4000)
const snap = async (tag) => console.log(tag, JSON.stringify(await page.evaluate(()=>({
  stage: window.__ch1Where.stage,
  task: window.__ch1Task ? { props: window.__ch1Task.props?.map(p=>({id:p.id, placed:p.placed})), opts: window.__ch1Task.opts } : null,
}))))
await snap('בטעינה:')
/* סוגרים את השיחה ובוחנים את שתי העדויות במקלדת בלבד */
const cx=140, cy=520
const L = () => page.evaluate(()=>({x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}))
const dlg = () => page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
async function talkOut(){ for(let i=0;i<20;i++){ if(!(await dlg())) return
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(450); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(400) } }
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
  const p=await L(); return Math.hypot(tx-p.x,tz-p.z)<=stop+1.2 }
let W = await page.evaluate(()=>window.__ch1Where)
if (W.cast.length) { await walkTo(W.cast[0].x, W.cast[0].z, 2.2); await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await talkOut() }
await snap('אחרי השיחה:')
for (let g=0; g<6; g++) { W = await page.evaluate(()=>window.__ch1Where)
  if (W.stage !== 'look') break
  const f = W.finds.find(x=>!x.done); if (!f) break
  await walkTo(f.x, f.z, 1.7); await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
  await page.keyboard.press('Escape'); await page.waitForTimeout(400) }
await snap('אחרי העדויות:')
W = await page.evaluate(()=>window.__ch1Where)
await walkTo(W.task.x, W.task.z, 2.4)
await page.waitForTimeout(3000)
await snap('ליד התחנה, בלי לגעת:')
console.log('שלב:', (await page.evaluate(()=>window.__ch1Where.stage)))
await browser.close()
