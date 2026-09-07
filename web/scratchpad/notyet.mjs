import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1000,height:600} })
page.on('pageerror', e=>console.log('ERR', e.message.slice(0,150)))
page.on('framenavigated', f=>{ if(f===page.mainFrame()) console.log('   [ניווט]') })
page.on('console', m=>{ const t=m.text(); if(/reload|Fast Refresh|hot-update/i.test(t)) console.log('   [console]', t.slice(0,90)) })
await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Live && window.__ch1Where, null, { timeout:180000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)
/* סוגרים את שיחת הפתיחה בלחיצות, כמו שחקן */
for (let i=0;i<25;i++){
  if (!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) break
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(500); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(450)
}
const st = () => page.evaluate(()=>({
  stage: window.__ch1Where?.stage,
  nearFind: window.__ch1Live?.nearFind ?? null,
  atTask: !!window.__ch1Live?.atTask,
  dlg: !!document.querySelector('.hud-dialogue'),
  panel: !!document.querySelector('.ch1-task'),
  findCard: !!document.querySelector('.ch1-find'),
  note: document.querySelector('.ch1-task-note')?.textContent ?? null,
}))
/* הולכים אל האבן, ברגליים */
/* מסובבים מפינת המסך: גרירה ממרכז המסך תופסת את הלפיד עצמו */
const cx=140, cy=520
const L = async () => { await page.waitForFunction(()=>window.__ch1Live, null, {timeout:30000}).catch(()=>{});
  return page.evaluate(()=>window.__ch1Live?{x:window.__ch1Live.player.x, z:window.__ch1Live.player.z, yaw:window.__ch1Live.yaw}:{x:0,z:0,yaw:0}) }
const closeDlg = async () => { for(let i=0;i<20;i++){
  if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) return
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(500); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(450) } }
const W2 = await page.evaluate(()=>window.__ch1Where)
const fd = W2.finds[0]
for (let n=0;n<26;n++){
  await closeDlg()
  const p = await L(); const d = Math.hypot(fd.x-p.x, fd.z-p.z)
  if (d <= 1.6) break
  const want = Math.PI - Math.atan2(fd.x-p.x, fd.z-p.z)
  let dd = want - p.yaw; while(dd>Math.PI)dd-=Math.PI*2; while(dd<-Math.PI)dd+=Math.PI*2
  const px = Math.round(dd/0.005)
  if (Math.abs(px)>=6){ await page.mouse.move(cx,cy); await page.mouse.down()
    const stp=Math.max(4,Math.min(30,Math.abs(px)/40))
    for(let i=1;i<=stp;i++) await page.mouse.move(cx+(px*i)/stp, cy)
    await page.mouse.up(); await page.waitForTimeout(200) }
  await page.keyboard.down('KeyW'); await page.waitForTimeout(d>8?1400:620); await page.keyboard.up('KeyW')
  await page.waitForTimeout(250)
}
await closeDlg()
await page.waitForTimeout(600)
console.log('לפני E:', JSON.stringify(await st()))
await page.keyboard.press('KeyE')
for (const ms of [400, 900, 2000]) { await page.waitForTimeout(ms); console.log(`אחרי ${ms}ms:`, JSON.stringify(await st())) }
await page.screenshot({ path:'/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/notyet.png' })
await browser.close()
