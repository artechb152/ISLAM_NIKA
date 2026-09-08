/* הליכה, סיבוב ושיחה — משותף לבדיקות. */
export function bind(page) {
  const cx=140, cy=520
  const L=()=>page.evaluate(()=>({x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}))
  const W=()=>page.evaluate(()=>window.__ch1Where)
  const dlg=()=>page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
  const cam=()=>page.evaluate(()=>{ const c=window.__ch1Camera; const l=window.__ch1Live
    return { x:+c.position.x.toFixed(2), y:+c.position.y.toFixed(2), z:+c.position.z.toFixed(2), fov:+c.fov.toFixed(1), yaw:+l.yaw.toFixed(3), px:+l.player.x.toFixed(2), pz:+l.player.z.toFixed(2) } })
  const talk=async(max=22)=>{for(let i=0;i<max;i++){if(!(await dlg()))return
    const b=await page.$('.hud-dialogue .hud-card-btn.is-primary')
    if(b){await b.click({timeout:2500}).catch(()=>{});await page.waitForTimeout(430);continue}
    await page.keyboard.press('Space');await page.waitForTimeout(380)}}
  const turn=async(tx,tz)=>{const p=await L()
    const want=Math.PI-Math.atan2(tx-p.x,tz-p.z); let d=want-p.yaw
    while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
    const px=Math.round(d/0.005); if(Math.abs(px)<6)return
    await page.mouse.move(cx,cy);await page.mouse.down()
    const st=Math.max(4,Math.min(30,Math.abs(px)/40))
    for(let i=1;i<=st;i++)await page.mouse.move(cx+(px*i)/st,cy)
    await page.mouse.up();await page.waitForTimeout(200)}
  const walk=async(tx,tz,stop=2.0,b=26)=>{for(let n=0;n<b;n++){
    if(await dlg())await talk()
    const p=await L();const d=Math.hypot(tx-p.x,tz-p.z);if(d<=stop)return true
    await turn(tx,tz);await page.keyboard.down('KeyW');await page.waitForTimeout(d>8?1400:620)
    await page.keyboard.up('KeyW');await page.waitForTimeout(230)}return false}
  const start=async(region, size={width:1440,height:820})=>{
    await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
    for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
      for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
      if (hit) break }
    await page.waitForFunction(()=>window.__ch1Where && window.__ch1Live && window.__ch1Camera, null, { timeout:180000 })
    for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
    await page.waitForTimeout(2500) }
  return { L, W, dlg, cam, talk, turn, walk, start }
}
