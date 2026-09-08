/* צילומים: סרט הפתיחה במסך מלא, ראיה עם היריעה, כרטיס הראיה בצד,
   ומדפי התחתית בשלב הפעולה. */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page); const say=console.log
/* תימן: הסרט */
await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where, null, {timeout:180000})
for (let i=0;i<30;i++){ if (await page.evaluate(()=>!!document.querySelector('.hud-dialogue.has-film'))) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)
const film = await page.evaluate(()=>{ const d=document.querySelector('.hud-dialogue.has-film'); const v=document.querySelector('.hud-dialogue.has-film video')
  if(!d) return null; const r=d.getBoundingClientRect(); const vr=v?v.getBoundingClientRect():null
  return { panel:`${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`, video: vr?`${Math.round(vr.width)}×${Math.round(vr.height)}`:'אין', vw:innerWidth, vh:innerHeight } })
say('סרט הפתיחה:', JSON.stringify(film))
await page.screenshot({ path:`${OUT}/shots/v3-film-fullscreen.png` })
/* ית'רב: ראיה ותקריב */
await K.start('yathrib')
let w = await K.W(); const f = w.finds[0]
await K.walk(f.x, f.z, 6, 20); await K.turn(f.x, f.z); await page.waitForTimeout(1200)
await page.screenshot({ path:`${OUT}/shots/v3-find-6m.png` })
const c = w.cast[0]
for (let r=0;r<8;r++){ const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  w=await K.W(); if (w.stage!=='brief' && !owed) break
  await K.walk(c.x,c.z,2.2); await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await K.talk() }
/* ראיה שאינה חובה בית'רב — ב-act היא זמינה? בודקים */
await K.walk(f.x, f.z, 1.7); await page.waitForTimeout(600)
const c0 = await K.cam()
await page.keyboard.press('KeyE'); await page.waitForTimeout(2600)
const open = await page.evaluate(()=>!!document.querySelector('.ch1-find'))
const c1 = await K.cam()
say('כרטיס ראיה:', open ? 'נפתח' : 'לא נפתח', '· מצלמה לפני', JSON.stringify(c0), '· בתקריב', JSON.stringify(c1))
await page.screenshot({ path:`${OUT}/shots/v3-find-card-side.png` })
await page.keyboard.press('Escape'); await page.waitForTimeout(2200)
const c2 = await K.cam()
say('אחרי סגירה:', JSON.stringify(c2), '· yaw חזר?', Math.abs(c2.yaw - c0.yaw) < 0.05 ? 'כן' : 'לא')
/* מדפי התחתית בשלב הפעולה */
w = await K.W(); await K.walk(w.task.x, w.task.z, 2.3); await page.waitForTimeout(3000)
const stack = await page.evaluate(()=>[...document.querySelectorAll('.hud-objective, .hud-hand, .hud-hint, .hud-goal')].map(e=>{const r=e.getBoundingClientRect(); return `${e.className.replace('hud-panel ','')} y ${Math.round(r.top)}..${Math.round(r.bottom)}`}))
say('מדפי התחתית:', stack.join(' · '))
await page.screenshot({ path:`${OUT}/shots/v3-hud-stack.png` })
await browser.close()
