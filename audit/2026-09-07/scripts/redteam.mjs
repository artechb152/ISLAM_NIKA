/* Red Team — ניסיונות מכוונים לעקוף את הרצף, בתחנת הגבול.
   כל הבדיקות כאן טבעיות (עכבר ומקלדת), חוץ ממה שמסומן [מסייעת].
   רץ מחוץ ל-web/ כדי לא להעיר את שרת הפיתוח. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const region = process.argv[2] || 'border-post'
const OUT = '/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const log = []
const say = (m) => { log.push(m); console.log(m) }
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1100,height:620} })
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0,160)))
page.on('framenavigated', f => { if (f === page.mainFrame()) say('   [ניווט] ' + f.url().slice(-50)) })
const boot = async (url) => {
  await page.goto(url, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
    for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await page.waitForFunction(()=>window.__ch1Where && window.__ch1Live, null, { timeout:180000 })
  for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
  await page.waitForTimeout(2000)
}
await boot(`http://localhost:3000/chapter1?region=${region}`)
const cx=140, cy=520
const L = async () => { await page.waitForFunction(()=>window.__ch1Live, null, {timeout:30000}).catch(()=>{})
  return page.evaluate(()=>window.__ch1Live?{x:window.__ch1Live.player.x,z:window.__ch1Live.player.z,yaw:window.__ch1Live.yaw}:{x:0,z:0,yaw:0}) }
const W = async () => { await page.waitForFunction(()=>window.__ch1Where, null, {timeout:60000}).catch(()=>{})
  return page.evaluate(()=>window.__ch1Where ?? {stage:'?',cast:[],finds:[],task:null}) }
const dlg = () => page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
const dlgText = () => page.evaluate(()=>(document.querySelector('.hud-dialogue')?.innerText ?? '').replace(/\s+/g,' ').slice(0,160))
const note = () => page.evaluate(()=>(document.querySelector('.ch1-task-note')?.textContent ?? '').trim().slice(0,140))
const panel = () => page.evaluate(()=>!!document.querySelector('.ch1-task'))
async function talkOut(max=18){ for(let i=0;i<max;i++){ if(!(await dlg())) return
  const b = await page.$('.hud-dialogue .hud-card-btn.is-primary')
  if (b) { await b.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(500); continue }
  await page.keyboard.press('Space'); await page.waitForTimeout(420) } }
async function turnTo(tx,tz){ const p=await L()
  const want = Math.PI - Math.atan2(tx-p.x, tz-p.z)
  let d = want - p.yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2
  const px = Math.round(d/0.005); if (Math.abs(px)<6) return
  await page.mouse.move(cx,cy); await page.mouse.down()
  const st=Math.max(4,Math.min(30,Math.abs(px)/40))
  for(let i=1;i<=st;i++) await page.mouse.move(cx+(px*i)/st, cy)
  await page.mouse.up(); await page.waitForTimeout(220) }
async function walkTo(tx,tz,stop=2.0,budget=30, clear=true){ for(let n=0;n<budget;n++){
  if (clear && await dlg()) await talkOut()
  const p=await L(); const d=Math.hypot(tx-p.x,tz-p.z); if(d<=stop) return true
  await turnTo(tx,tz); await page.keyboard.down('KeyW'); await page.waitForTimeout(d>8?1400:620)
  await page.keyboard.up('KeyW'); await page.waitForTimeout(250) }
  const p=await L(); return Math.hypot(tx-p.x,tz-p.z)<=stop+1.2 }

let w = await W()
say(`== Red Team · ${region} · פתיחה: ${w.stage}`)

/* RT-1: E בריק לפני הכול */
await page.keyboard.press('KeyE'); await page.waitForTimeout(800)
say(`RT-1 E בריק לפני ההקדמה → שיחה: ${await dlg()} · פאנל: ${await panel()} · הודעה: "${await note()}"`)
await talkOut()

/* RT-2: יציאה לפני הליבה — הולכים אל השער מיד */
if (w.gate) {
  const got = await walkTo(w.gate.x, w.gate.z, 1.3, 40, false)
  await page.waitForTimeout(1500)
  const held = await page.evaluate(()=>!!document.querySelector('.poi-gate-hold'))
  say(`RT-2 שער לפני הליבה → הגעתי: ${got} · השער מוחזק: ${held} · שיחה: ${await dlg()} · "${await dlgText()}" · אזור: ${await page.evaluate(()=>window.__ch1Where?.region)}`)
  await talkOut()
}

/* RT-3: E על המשימה לפני העדויות */
w = await W()
if (w.task) {
  await walkTo(w.task.x, w.task.z, 2.2)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
  say(`RT-3 E על התחנה בשלב ${w.stage} → פאנל: ${await panel()} · הודעה: "${await note()}"`)
  await talkOut()
}

/* RT-4: ההקדמה, עם לחיצה כפולה על „לשורה הבאה" */
w = await W()
if (w.stage === 'brief' && w.cast.length) {
  const c = w.cast[0]; await walkTo(c.x, c.z, 2.2)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
  const before = await page.evaluate(()=>document.querySelector('.hud-dialogue-count')?.textContent ?? '')
  const btn = await page.$('.hud-dialogue .hud-card-btn:not(.is-primary)')
  if (btn) { await btn.dblclick({timeout:3000}).catch(()=>{}); await page.waitForTimeout(700) }
  const after = await page.evaluate(()=>document.querySelector('.hud-dialogue-count')?.textContent ?? '')
  say(`RT-4 לחיצה כפולה על „לשורה הבאה" → מונה לפני "${before}" אחרי "${after}"`)
  await talkOut()
}
w = await W(); say(`   שלב אחרי ההקדמה: ${w.stage}`)

/* RT-5: E על המשימה בשלב look (לפני העדויות) */
if (w.task && w.stage === 'look') {
  await walkTo(w.task.x, w.task.z, 2.2)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
  say(`RT-5 E על התחנה בשלב look → פאנל: ${await panel()} · הודעה: "${await note()}"`)
}

/* RT-6: רענון באמצע — האם ההתקדמות נשמרת */
const stBefore = (await W()).stage
await page.reload({ waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where, null, {timeout:180000}).catch(()=>{})
await page.waitForTimeout(3000)
say(`RT-6 רענון באמצע → שלב לפני: ${stBefore} · אחרי: ${(await W()).stage} · אזור: ${await page.evaluate(()=>window.__ch1Where?.region)}`)

/* RT-7: E כפול מהיר על עדות */
w = await W()
const f = w.finds.find(q=>!q.done)
if (f && w.stage === 'look') {
  await walkTo(f.x, f.z, 1.7)
  await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
  const cards = await page.$$eval('.ch1-find, .hud-panel.ch1-find', els=>els.length)
  say(`RT-7 E כפול על עדות → כרטיסים פתוחים: ${cards}`)
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
}

/* RT-8: ניסיון לגרור חפץ משימה לפני תורו (בשלב look) */
w = await W()
if (w.stage === 'look' && w.task) {
  await walkTo(w.task.x, w.task.z, 2.4)
  await page.waitForTimeout(1500)
  const t = await page.evaluate(()=>window.__ch1Task)
  say(`RT-8 חפצי משימה נגישים בשלב look? → ${t ? (t.props?.length ?? 0) + ' חפצים על המסך, נעולים: ' + (t.opts?.filter(o=>o.locked).length ?? '?') : 'אין __ch1Task (אין חפצים פעילים)'}`)
}
await page.screenshot({ path: `${OUT}/shots/redteam-${region}.png` })
if (errs.length) say('JS: ' + [...new Set(errs)].slice(0,3).join(' | '))
fs.writeFileSync(`${OUT}/logs/redteam-${region}.log`, log.join('\n') + '\n')
await browser.close()
