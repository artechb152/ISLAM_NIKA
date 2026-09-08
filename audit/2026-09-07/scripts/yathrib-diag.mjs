/* ית'רב: המצלמה לפני/אחרי שיחה ולפני/אחרי המשימה, הלוח בכל שלב,
   ונראות הראיות. */
import fs from 'node:fs'
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page); const say=console.log
await K.start('yathrib')
const board = () => page.evaluate(()=>{ const o=window.__ch1Scene.getObjectByName('task:yathrib-board'); return o ? (o.visible?'קיים':'מוסתר') : 'אין' })
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z).toFixed(2)
say('לוח בפתיחה:', await board())

/* ראיה — נראות ממרחק */
let w = await K.W()
const f = w.finds[0]
await K.walk(f.x, f.z, 7, 20)
await K.turn(f.x, f.z); await page.waitForTimeout(1200)
await page.screenshot({ path:`${OUT}/shots/find-far-7m.png` })
await K.walk(f.x, f.z, 3.2, 10); await K.turn(f.x, f.z); await page.waitForTimeout(1200)
await page.screenshot({ path:`${OUT}/shots/find-near-3m.png` })
say('צילומי ראיה: 7 מ׳ ו-3 מ׳')

/* המצלמה סביב שיחה */
w = await K.W(); const c = w.cast[0]
await K.walk(c.x, c.z, 2.2); await page.waitForTimeout(1500)
const c0 = await K.cam()
await page.keyboard.press('KeyE'); await page.waitForTimeout(2200)
const c1 = await K.cam()
await K.talk(); await page.waitForTimeout(3000)
const c2 = await K.cam()
say(`מצלמה · לפני שיחה ${JSON.stringify(c0)}`)
say(`מצלמה · בשיחה     ${JSON.stringify(c1)}`)
say(`מצלמה · אחרי      ${JSON.stringify(c2)} · מרחק מהמצב שלפני: ${dist(c0,c2)} מ׳ · fov ${c0.fov}→${c2.fov} · yaw ${c0.yaw}→${c2.yaw}`)
say('לוח אחרי שיחה ראשונה:', await board())

/* שאר השיחות */
for (let r=0;r<10;r++){ const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  w=await K.W(); if (w.stage!=='brief' && !owed) break
  await K.walk(c.x,c.z,2.2); await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await K.talk() }
say('שלב אחרי כל השיחות:', (await K.W()).stage, '· לוח:', await board())

/* פתיחת כרטיס ראיה */
await K.walk(f.x, f.z, 1.7); await page.keyboard.press('KeyE'); await page.waitForTimeout(1400)
await page.screenshot({ path:`${OUT}/shots/find-card.png` })
say('כרטיס ראיה פתוח:', await page.evaluate(()=>!!document.querySelector('.ch1-find')))
await page.keyboard.press('Escape'); await page.waitForTimeout(600)
const f2 = w.finds[1]; if (f2) { await K.walk(f2.x,f2.z,1.7); await page.keyboard.press('KeyE'); await page.waitForTimeout(1000); await page.keyboard.press('Escape'); await page.waitForTimeout(500) }

/* המצלמה סביב המשימה */
w = await K.W()
const before = await K.cam()
await K.walk(w.task.x, w.task.z, 2.3); await page.waitForTimeout(3500)
const inFocus = await K.cam()
say(`מצלמה · לפני התחנה ${JSON.stringify(before)}`)
say(`מצלמה · בתקריב      ${JSON.stringify(inFocus)}`)
await page.screenshot({ path:`${OUT}/shots/yathrib-task-focus.png` })
say('לוח בשלב הפעולה:', await board())
/* ממלאים במקלדת */
for (let round=0; round<8; round++){
  const t = await page.evaluate(()=>window.__ch1Task?.props?.map(p=>p.placed))
  if (!t || !t.some(x=>!x)) break
  await page.keyboard.press('KeyF'); await page.waitForTimeout(600)
  let ok=false
  for (let k=0;k<3&&!ok;k++){ await page.keyboard.press('KeyF'); await page.waitForTimeout(800)
    const t2=await page.evaluate(()=>window.__ch1Task?.props?.map(p=>p.placed))
    ok = JSON.stringify(t2)!==JSON.stringify(t)
    if(!ok){ await page.keyboard.press('KeyF'); await page.waitForTimeout(400); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(350) } }
}
say('אחרי המיון:', (await K.W()).stage, '· לוח:', await board())
await page.keyboard.press('KeyE'); await page.waitForTimeout(1300)
for (let k=0;k<5;k++){ const b=await page.$$('.ch1-task-interpret button'); if(!b.length) break
  await b[k%b.length].click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1000); if((await K.W()).task?.solved) break }
for (let k=0;k<10;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
await K.talk(); await page.waitForTimeout(2500)
const after = await K.cam()
say(`מצלמה · אחרי הפירוש ${JSON.stringify(after)} · מרחק מלפני התחנה: ${dist(before,after)} · fov ${before.fov}→${after.fov}`)
say('שלב:', (await K.W()).stage, '· לוח:', await board())
/* שיחות הסיום */
for (let r=0;r<6;r++){ const held=await page.evaluate(()=>!!document.querySelector('.poi-gate-hold')); if(!held) break
  await K.walk(c.x,c.z,2.2); await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await K.talk() }
await page.waitForTimeout(2000)
say('אחרי שיחות הסיום:', (await K.W()).stage, '· לוח:', await board(), '· השער:', await page.evaluate(()=>!document.querySelector('.poi-gate-hold')?'פתוח':'נעול'))
await page.screenshot({ path:`${OUT}/shots/yathrib-after-talk.png` })
const c3 = await K.cam()
say(`מצלמה · בסוף ${JSON.stringify(c3)}`)
await browser.close()
