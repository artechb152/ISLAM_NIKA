/* התקריב על הראיה: E על ראיה שאינה חובה בשלב הפעולה — הכרטיס בצד,
   המצלמה על החפץ, והחזרה אחרי הסגירה. */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page); const say=console.log
await K.start('yathrib')
let w = await K.W(); const c = w.cast[0]
for (let r=0;r<8;r++){ const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  w=await K.W(); if (w.stage!=='brief' && !owed) break
  await K.walk(c.x,c.z,2.2); await page.keyboard.press('KeyE'); await page.waitForTimeout(900); await K.talk() }
say('שלב:', (await K.W()).stage)
const f = w.finds[0]
for (let tries=0; tries<4; tries++){
  const ok = await K.walk(f.x, f.z, 1.6, 30); if (ok) break
  const side = tries%2 ? 'KeyA' : 'KeyD'; await page.keyboard.down(side); await page.waitForTimeout(900); await page.keyboard.up(side) }
await K.turn(f.x, f.z); await page.waitForTimeout(800)
const c0 = await K.cam()
say('מרחקים:', JSON.stringify(await page.evaluate(()=>{ const p=window.__ch1Live.player
  return window.__ch1Where.finds.map(f=>({ id:f.id, d:+Math.hypot(p.x-f.x,p.z-f.z).toFixed(2), done:!!f.done, fx:f.x, fz:f.z, px:+p.x.toFixed(2), pz:+p.z.toFixed(2) })) })))
say('לפני E:', JSON.stringify(await page.evaluate(()=>({ nearFind: window.__ch1Live.nearFind ?? null, d: String(window.__ch1Live.nearFindD),
  nearWho: window.__ch1Live.nearWho ?? null, atTask: !!window.__ch1Live.atTask, stage: window.__ch1Where.stage, dlg: !!document.querySelector('.hud-dialogue') }))))
await page.keyboard.press('KeyE'); await page.waitForTimeout(2800)
say('אחרי E:', JSON.stringify(await page.evaluate(()=>({ find: !!document.querySelector('.ch1-find'), dlg: !!document.querySelector('.hud-dialogue'),
  note: (document.querySelector('.ch1-task-note')?.textContent??'').trim().slice(0,90), focus: window.__ch1Live.findFocus }))))
const open = await page.evaluate(()=>{ const el=document.querySelector('.ch1-find-card'); if(!el) return null
  const r=el.getBoundingClientRect(); return { x:Math.round(r.left), w:Math.round(r.width), h:Math.round(r.height), title:(el.querySelector('h3')?.textContent??'').trim() } })
const c1 = await K.cam()
const findOnScreen = await page.evaluate(({x,z})=>{ const sc=window.__ch1Scene; const V=sc.position.constructor
  const v=new V(x,0.3,z); v.project(window.__ch1Camera); return { sx:Math.round((v.x*0.5+0.5)*innerWidth), sy:Math.round((-v.y*0.5+0.5)*innerHeight) } }, f)
say('כרטיס:', JSON.stringify(open), '· הראיה על המסך ב-', JSON.stringify(findOnScreen))
say('מצלמה לפני:', JSON.stringify(c0)); say('מצלמה בתקריב:', JSON.stringify(c1), '· מרחק מהראיה:', Math.hypot(c1.x-f.x, c1.z-f.z).toFixed(2), 'מ׳')
await page.screenshot({ path:`${OUT}/shots/v4-find-zoom.png` })
await page.keyboard.press('Escape'); await page.waitForTimeout(2600)
const c2 = await K.cam()
say('אחרי סגירה:', JSON.stringify(c2), '· yaw חזר?', Math.abs(c2.yaw-c0.yaw)<0.05?'כן':'לא', '· fov', c2.fov)
await page.screenshot({ path:`${OUT}/shots/v4-find-after.png` })
await browser.close()
