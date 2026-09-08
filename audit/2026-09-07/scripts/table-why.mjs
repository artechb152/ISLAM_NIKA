/* למה הגרירה על שולחן הראיות אינה מתחילה: מה יושב מתחת לסמן, ומה
   המרחק בפועל בין נקודת הלחיצה למקום שהרכיב מחשב לחפץ. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1100,height:620} })
page.on('pageerror', e=>console.log('ERR', e.message.slice(0,140)))
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Camera, null, { timeout:180000 })
await page.waitForTimeout(9000)
/* מגיעים אל השולחן בהליכה, כדי שהשלב יהיה act והשולחן פעיל */
const cx=140, cy=520
const L=()=>page.evaluate(()=>({x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}))
const dlg=()=>page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
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
let W=await page.evaluate(()=>window.__ch1Where)
for(let r=0;r<12;r++){W=await page.evaluate(()=>window.__ch1Where)
  const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  if(W.stage!=='brief'&&!owed)break
  if(W.cast.length){const c=W.cast[0];await walkTo(c.x,c.z,2.2);await talkOut()
    await page.keyboard.press('KeyE');await page.waitForTimeout(900);await talkOut()}
  else{await page.waitForTimeout(4000);await talkOut()}}
for(let g=0;g<8;g++){W=await page.evaluate(()=>window.__ch1Where);if(W.stage!=='look')break
  const f=W.finds.find(x=>!x.done);if(!f)break
  await walkTo(f.x,f.z,1.7);await page.keyboard.press('KeyE');await page.waitForTimeout(1000)
  await page.keyboard.press('Escape');await page.waitForTimeout(400)}
W=await page.evaluate(()=>window.__ch1Where)
await walkTo(W.task.x+2.1, W.task.z+1.3+2.4, 1.6)
await page.waitForTimeout(3000)
console.log('שלב:', (await page.evaluate(()=>window.__ch1Where.stage)))
const t = await page.evaluate(()=>window.__ch1TableAt ? window.__ch1TableAt() : null)
console.log('מצב השולחן:', JSON.stringify(t))
if (t) { for (const a of t.at) {
  const el = await page.evaluate(({x,y})=>{const e=document.elementFromPoint(Math.round(x),Math.round(y)); return e?e.tagName+'.'+String(e.className||'').slice(0,30):'none'}, {x:a.x,y:a.y})
  console.log(`  חפץ ${a.i}: מסך ${Math.round(a.x)},${Math.round(a.y)} · ok=${a.ok} · תחתיו ${el}`)
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.waitForTimeout(300)
  const held = await page.evaluate(()=>window.__ch1TableAt().drag)
  console.log(`     אחרי לחיצה: drag=${held}`)
  await page.mouse.move(a.x+10, a.y-20); await page.waitForTimeout(200)
  await page.mouse.up(); await page.waitForTimeout(600)
} }
const info = await page.evaluate(() => {
  const sc = window.__ch1Scene; sc.updateMatrixWorld(true)
  const cam = window.__ch1Camera, V = sc.position.constructor
  const canvas = document.querySelector('canvas')
  const r = canvas.getBoundingClientRect()
  const proj = (x,y,z) => { const v=new V(x,y,z); v.project(cam)
    return { x:(v.x*0.5+0.5)*r.width+r.left, y:(-v.y*0.5+0.5)*r.height+r.top, ok:v.z<=1 } }
  const out = { canvas: !!canvas, rect: {w:Math.round(r.width), h:Math.round(r.height)}, items: [] }
  for (const id of ['stone','verse','later']) {
    const o = sc.getObjectByName('evi:'+id); if (!o) continue
    const w = o.getWorldPosition(new V())
    const p = proj(w.x, w.y + 0.17, w.z)
    const el = document.elementFromPoint(Math.round(p.x), Math.round(p.y))
    out.items.push({ id, world:{x:+w.x.toFixed(2), y:+w.y.toFixed(2), z:+w.z.toFixed(2)},
      screen:{x:Math.round(p.x), y:Math.round(p.y), onScreen:p.ok},
      under: el ? (el.tagName + '.' + String(el.className||'').slice(0,40)) : 'none' })
  }
  out.stage = window.__ch1Where.stage
  out.player = { x:+window.__ch1Live.player.x.toFixed(1), z:+window.__ch1Live.player.z.toFixed(1) }
  return out
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
