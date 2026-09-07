/* Playthrough אמיתי: עכבר ומקלדת בלבד.
   בלי טלפורט, בלי קביעת state. הקריאה מ-__ch1Where היא קריאה בלבד —
   כמו עין של שחקן שרואה איפה הדברים. הפנייה נעשית בגרירת עכבר
   אמיתית (0.005 רדיאן לפיקסל), וההליכה ב-W. */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
const region = process.argv[2]
const dir = `scratchpad/video/play-${region}`
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport:{width:1100,height:620}, recordVideo:{ dir, size:{width:1100,height:620} } })
const page = await ctx.newPage()
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0,140)))
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where, null, { timeout:150000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)

const W = () => page.evaluate(()=>window.__ch1Where)
const live = async () => {
  await page.waitForFunction(()=>window.__ch1Live, null, { timeout: 60000 }).catch(()=>{})
  return page.evaluate(()=>window.__ch1Live
    ? { x:window.__ch1Live.player.x, z:window.__ch1Live.player.z, yaw:window.__ch1Live.yaw }
    : { x:0, z:0, yaw:0 })
}
const dlg = () => page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
const cx = 550, cy = 310
async function turnTo(tx, tz) {
  const p = await live()
  const want = Math.atan2(tx - p.x, tz - p.z)          // heading
  const wantYaw = Math.PI - want                        // ראה את ההערה על yaw ב-Player
  let d = wantYaw - p.yaw
  while (d >  Math.PI) d -= Math.PI*2
  while (d < -Math.PI) d += Math.PI*2
  const px = Math.round(d / 0.005)
  if (Math.abs(px) < 6) return
  await page.mouse.move(cx, cy); await page.mouse.down()
  const steps = Math.max(4, Math.min(30, Math.abs(px) / 40))
  for (let i=1;i<=steps;i++) await page.mouse.move(cx + (px*i)/steps, cy)
  await page.mouse.up()
  await page.waitForTimeout(220)
}
async function talkOut(max = 14) {
  for (let i=0;i<max;i++){
    if (!(await dlg())) return
    /* בשורה האחרונה החלונית אינה נסגרת ברווח — היא מחכה ללחיצה על
       „סיום שיחה" / „לעבודה". שחקן לוחץ; הבדיקה הקודמת רק הקישה רווח,
       והשיחה נשארה פתוחה. תחנת הגבול נתקעה שם 69 דקות. */
    const btn = await page.$('.hud-dialogue .hud-card-btn.is-primary')
    if (btn) { await btn.click({ timeout: 3000 }).catch(()=>{}); await page.waitForTimeout(500); continue }
    await page.keyboard.press('Space'); await page.waitForTimeout(420)
  }
}
async function walkTo(tx, tz, stopAt = 1.9, budget = 26) {
  for (let n=0; n<budget; n++) {
    /* דיבור פתוח מבטל את מקשי התנועה — וזה נכון. הבדיקה הקודמת ניסתה
       ללכת עם חלונית פתוחה ובזבזה 26 צעדים ריקים בכל סיבוב. */
    if (await dlg()) await talkOut()
    const p = await live()
    const d = Math.hypot(tx-p.x, tz-p.z)
    if (d <= stopAt) return true
    await turnTo(tx, tz)
    await page.keyboard.down('KeyW')
    await page.waitForTimeout(d > 8 ? 1400 : 620)
    await page.keyboard.up('KeyW')
    await page.waitForTimeout(260)
    const q = await live()
    if (Math.hypot(q.x-p.x, q.z-p.z) < 0.12 && d > stopAt) {
      /* לא זזנו — משהו חוסם. נסה לעקוף */
      await page.keyboard.down('KeyA'); await page.waitForTimeout(700); await page.keyboard.up('KeyA')
    }
  }
  const p = await live()
  return Math.hypot(tx-p.x, tz-p.z) <= stopAt + 1.2
}
const log = []
const say = (m) => { log.push(m); console.log(m) }

let w = await W()
say(`== ${region} · פתיחה בשלב ${w.stage}`)
// 1) השיחה
for (let round=0; round<8; round++) {
  w = await W()
  if (w.stage !== 'brief') break
  if (w.cast.length) {
    const c = w.cast[0]
    const got = await walkTo(c.x, c.z, 2.2)
    say(`   הליכה אל ${c.who}: ${got ? 'הגעתי' : 'לא הצלחתי להגיע'}`)
    await talkOut()
    await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
    await talkOut()
  } else {
    await page.waitForTimeout(5200); await talkOut()
  }
}
w = await W(); say(`   אחרי השיחה: ${w.stage}`)

// 2) העדויות
for (let guard=0; guard<8; guard++) {
  w = await W()
  if (w.stage !== 'look') break
  const f = w.finds.find(q => !q.done)
  if (!f) break
  const got = await walkTo(f.x, f.z, 1.7)
  say(`   הליכה אל ${f.id}: ${got ? 'הגעתי' : 'לא הצלחתי'}`)
  await talkOut()
  await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  await talkOut()
}
w = await W(); say(`   אחרי העדויות: ${w.stage} (${w.finds.filter(f=>f.done).length}/${w.finds.length})`)

// 3) הפעולה
if (w.task) {
  const got = await walkTo(w.task.x, w.task.z, 2.3)
  say(`   הליכה אל התחנה: ${got ? 'הגעתי' : 'לא הצלחתי'}`)
  await page.waitForTimeout(5000)
  for (let round=0; round<10; round++) {
    const t = await page.evaluate(()=>window.__ch1Task)
    if (!t) { say('   אין חפצים לגרירה'); break }
    const item = t.props.find(p=>!p.placed)
    if (!item) break
    const zones = t.bins?.length ? t.bins : [t.target]
    let ok = false
    for (const b of zones) {
      await page.waitForTimeout(900)
      const snap = await page.evaluate(()=>window.__ch1Task)
      const fresh = snap?.props?.find(p=>p.id===item.id)
      if (fresh) { item.x = fresh.x; item.y = fresh.y }
      await page.mouse.move(item.x, item.y); await page.mouse.down()
      for (let s=1;s<=12;s++){ await page.mouse.move(item.x+(b.x-item.x)*s/12, item.y+(b.y-item.y)*s/12); await page.waitForTimeout(45) }
      await page.mouse.up(); await page.waitForTimeout(1200)
      const s2 = await page.evaluate(()=>window.__ch1Task)
      if (s2?.props?.find(p=>p.id===item.id)?.placed) { ok = true; break }
    }
    say(`   גרירת ${item.id}: ${ok ? 'הונח' : 'לא נכנס'}`)
    if (!ok) break
  }
}
w = await W(); say(`   אחרי הפעולה: ${w.stage}`)

// 4) הפירוש
if (w.stage === 'interpret') {
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1200)
  for (let k=0;k<5;k++){
    const btns = await page.$$('.ch1-task-interpret button')
    if (!btns.length) break
    await btns[k % btns.length].click({timeout:4000}).catch(()=>{})
    await page.waitForTimeout(1100)
    if ((await W()).task?.solved) break
  }
  for (let k=0;k<12;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  await talkOut()
}
w = await W(); say(`   אחרי הפירוש: ${w.stage}`)

// 4.5) שיחת הסיום — היציאה מחכה לה, ולא רק למשימה
for (let round=0; round<5; round++) {
  const held = await page.evaluate(()=>!!document.querySelector('.poi-gate-hold'))
  if (!held) break
  w = await W()
  if (!w.cast.length) break
  const p0 = await live()
  const c = [...w.cast].sort((a,b)=>Math.hypot(a.x-p0.x,a.z-p0.z)-Math.hypot(b.x-p0.x,b.z-p0.z))[0]
  const got = await walkTo(c.x, c.z, 2.2)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
  const spoke = await dlg()
  await talkOut(20)
  say(`   שיחת סיום עם ${c.who}: ${got ? (spoke ? 'דיברנו' : 'לא נפתחה') : 'לא הגעתי'}`)
  if (!got || !spoke) break
}

// 5) השער
const gateOpen = await page.evaluate(()=>!document.querySelector('.poi-gate-hold'))
say(`   השער: ${gateOpen ? 'פתוח' : 'עדיין נעול'}`)
if (w.gate && gateOpen) {
  const got = await walkTo(w.gate.x, w.gate.z, 1.2, 60)
  await page.waitForTimeout(5000)
  const now = await page.evaluate(()=>window.__ch1Where?.region)
  const p2 = await live()
  const left = Math.hypot(w.gate.x-p2.x, w.gate.z-p2.z).toFixed(1)
  say(`   הליכה אל השער: ${got ? 'הגעתי' : `לא הצלחתי (נשארו ${left} מ')`} · עברתי אל: ${now}`)
}
if (errs.length) say(`   JS: ${[...new Set(errs)].slice(0,2).join(' | ')}`)
await ctx.close(); await browser.close()
const f = fs.readdirSync(dir).find(n=>n.endsWith('.webm'))
if (f) { fs.renameSync(`${dir}/${f}`, `${dir}/play.webm`); console.log(`   וידאו: ${dir}/play.webm`) }
