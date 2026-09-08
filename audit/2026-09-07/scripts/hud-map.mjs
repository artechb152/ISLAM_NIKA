/* מפת כל החלוניות והכרטיסיות על המסך: מיקום, גודל, חפיפה — בשלב
   שיחה ובשלב פעולה, בכמה גדלי מסך. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}
const MAP = `(() => {
  const SEL = '.hud-panel, .ch1-task, .ch1-find, .ch1-task-note, .hud-dialogue, .hud-objective, .hud-hand, .hud-hint, .poi-marker, .ch1-arrive, .hud-controls, .ch1-film, .hud-toast'
  const els = [...document.querySelectorAll(SEL)].filter(el=>{
    const cs=getComputedStyle(el); const r=el.getBoundingClientRect()
    return cs.visibility!=='hidden' && cs.display!=='none' && +cs.opacity>0.05 && r.width>4 && r.height>4 })
  const box = el => { const r=el.getBoundingClientRect()
    return { cls:String(el.className||'').replace(/\\s+/g,' ').slice(0,34),
      x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height),
      cy:Math.round(r.top+r.height/2), z:getComputedStyle(el).zIndex } }
  const boxes = els.map(box)
  const overlaps = []
  for (let i=0;i<els.length;i++) for (let j=i+1;j<els.length;j++) {
    if (els[i].contains(els[j]) || els[j].contains(els[i])) continue
    const a=boxes[i], b=boxes[j]
    const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)
    const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)
    if (ox>4 && oy>4) overlaps.push(\`\${a.cls} × \${b.cls} — \${ox}×\${oy}px\`)
  }
  return { vh: innerHeight, vw: innerWidth, boxes, overlaps }
})()`
async function shot(region, size, label, prep) {
  const page = await browser.newPage({ viewport:size })
  await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
    for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await page.waitForFunction(()=>window.__ch1Where, null, { timeout:150000 }).catch(()=>{})
  await page.waitForTimeout(10000)
  if (prep) await prep(page)
  const r = await page.evaluate(MAP)
  say(`\n══ ${region} · ${size.width}×${size.height} · ${label}`)
  for (const b of r.boxes) say(`   x ${String(b.x).padStart(4)}..${String(b.x+b.w).padStart(4)}  y ${String(b.y).padStart(4)}..${String(b.y+b.h).padStart(4)}  z=${b.z}  ${b.cls}`)
  say(`   חפיפות: ${r.overlaps.length}`)
  for (const o of r.overlaps) say(`     ✗ ${o}`)
  await page.screenshot({ path: `${OUT}/shots/hud-${region}-${size.width}-${label}.png` })
  await page.close()
}
const play = async (page) => {
  const L=()=>page.evaluate(()=>({x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}))
  const dlg=()=>page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
  const W=()=>page.evaluate(()=>window.__ch1Where)
  const talk=async()=>{for(let i=0;i<20;i++){if(!(await dlg()))return
    const b=await page.$('.hud-dialogue .hud-card-btn.is-primary')
    if(b){await b.click({timeout:2500}).catch(()=>{});await page.waitForTimeout(420);continue}
    await page.keyboard.press('Space');await page.waitForTimeout(380)}}
  const turn=async(tx,tz)=>{const p=await L()
    const want=Math.PI-Math.atan2(tx-p.x,tz-p.z); let d=want-p.yaw
    while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
    const px=Math.round(d/0.005); if(Math.abs(px)<6)return
    await page.mouse.move(140,520);await page.mouse.down()
    const st=Math.max(4,Math.min(30,Math.abs(px)/40))
    for(let i=1;i<=st;i++)await page.mouse.move(140+(px*i)/st,520)
    await page.mouse.up();await page.waitForTimeout(200)}
  const walk=async(tx,tz,stop=2.0,b=26)=>{for(let n=0;n<b;n++){
    if(await dlg())await talk()
    const p=await L();const d=Math.hypot(tx-p.x,tz-p.z);if(d<=stop)return true
    await turn(tx,tz);await page.keyboard.down('KeyW');await page.waitForTimeout(d>8?1400:620)
    await page.keyboard.up('KeyW');await page.waitForTimeout(230)}return false}
  let w=await W()
  for(let r=0;r<12;r++){w=await W()
    const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
    if(w.stage!=='brief'&&!owed)break
    if(w.cast.length){const p=await L()
      const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
      await walk(c.x,c.z,2.2);await talk()
      await page.keyboard.press('KeyE');await page.waitForTimeout(900);await talk()}
    else{await page.waitForTimeout(4000);await talk()}}
  for(let g=0;g<8;g++){w=await W();if(w.stage!=='look')break
    const f=w.finds.find(x=>!x.done);if(!f)break
    await walk(f.x,f.z,1.7);await page.keyboard.press('KeyE');await page.waitForTimeout(1000)
    await page.keyboard.press('Escape');await page.waitForTimeout(400)}
  w=await W()
  if(w.task) await walk(w.task.x+2.1, w.task.z+1.3+2.6, 1.8)
  await page.waitForTimeout(2500)
  /* מפעילים גם את הודעת „עדיין לא" כדי שהכרטיסייה העליונה תופיע */
  await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
}
for (const size of [{width:1512,height:860},{width:1280,height:720}]) {
  await shot('mecca', size, 'פעולה', play)
}
fs.writeFileSync(`${OUT}/logs/hud-map.log`, lines.join('\n')+'\n')
await browser.close()
