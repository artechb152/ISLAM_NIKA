/* מה עומד בין המצלמה לשולחן במכה: קרן מן השולחן אל המצלמה, ושמות הפגיעות. */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page); const say=console.log
await K.start('mecca')
let w=await K.W()
for (let r=0;r<12;r++){ const owed=await page.evaluate(()=>/יש עוד/.test(document.querySelector('.hud-objective')?.textContent??''))
  w=await K.W(); if (w.stage!=='brief' && !owed) break
  const p=await K.L(); const c=[...w.cast].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]
  await K.walk(c.x,c.z,2.2); await K.talk(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1000); await K.talk() }
for (let g=0;g<8;g++){ w=await K.W(); if(w.stage!=='look') break
  const f=w.finds.find(x=>!x.done); if(!f) break
  await K.walk(f.x,f.z,1.7,60); await page.keyboard.press('KeyE'); await page.waitForTimeout(1100); await page.keyboard.press('Escape'); await page.waitForTimeout(400) }
w=await K.W()
await K.walk(w.task.x, w.task.z+2.0, 1.4, 70); await page.waitForTimeout(5000)
const c = await K.cam()
say('שלב', (await K.W()).stage, '· atTask', await page.evaluate(()=>!!window.__ch1Live.atTask), '· תקריב', JSON.stringify(await page.evaluate(()=>window.__ch1Live.taskFocus)), '· מצלמה', JSON.stringify(c))
const hits = await page.evaluate(({tx,tz})=>{
  const sc=window.__ch1Scene; sc.updateMatrixWorld(true); const cam=window.__ch1Camera; const V=sc.position.constructor
  const THREE_Ray = cam.constructor.prototype.constructor; // לא נחוץ — משתמשים ב-Raycaster דרך אובייקט קיים
  const origin = new V(tx, 1.2, tz); const dir = cam.position.clone().sub(origin); const len = dir.length(); dir.normalize()
  /* Raycaster אינו נגיש כמחלקה — מוצאים אותו דרך אובייקט קיים */
  const Ray = (function(){ try { return new (Object.getPrototypeOf(sc).constructor)().constructor } catch(e){ return null } })()
  const rc = window.__ch1Raycaster || null
  const out = { len:+len.toFixed(2), hits:[] }
  if (!rc) { out.note='אין Raycaster חשוף'; return out }
  rc.set(origin, dir); rc.far = len
  const res = rc.intersectObjects(sc.children, true)
  for (const h of res.slice(0,6)) { let nm=''; for (let a=h.object; a && !nm; a=a.parent) if (a.name) nm=a.name
    out.hits.push({ d:+h.distance.toFixed(2), name:nm.slice(0,36) || h.object.type }) }
  return out
}, {tx:w.task.x, tz:w.task.z})
say('קרן שולחן→מצלמה:', JSON.stringify(hits))
say('DOM ליד השולחן:', JSON.stringify(await page.evaluate(()=>{
  const r=(sel)=>{const e=document.querySelector(sel); if(!e) return null; const b=e.getBoundingClientRect(); return {y:Math.round(b.top), h:Math.round(b.height), t:(e.textContent||'').trim().slice(0,40)}}
  return { taskMarker: r('.poi-marker.is-task-marker'), note: r('.ch1-task-note'), hand: r('.hud-hand'), objective: r('.hud-objective'), atTask: !!window.__ch1Live.atTask, stage: window.__ch1Where.stage } })))
await page.screenshot({ path:`${OUT}/shots/v6-mecca-table.png` })
await browser.close()
