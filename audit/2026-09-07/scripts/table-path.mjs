/* למה אי אפשר להתקרב לשולחן במכה: מיקום, גובה קרקע ומה חוסם, צעד אחר צעד,
   משלושה כיוונים. */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1000,height:600} })
const K = bind(page); const say=console.log
await K.start('mecca')
const w = await K.W(); const T = w.task
say('שולחן:', JSON.stringify(T))
const probe = () => page.evaluate((T)=>{ const L=window.__ch1Live; const p=L.player
  const g = (window.__ch1GroundY ? window.__ch1GroundY(p.x,p.z) : null)
  const cams = []; window.__ch1Scene.traverse(o=>{ if(/^camel:/.test(o.name||'')){ const v=o.getWorldPosition(new o.position.constructor()); cams.push([+v.x.toFixed(1),+v.z.toFixed(1)]) } })
  return { x:+p.x.toFixed(2), z:+p.z.toFixed(2), y:+(p.y??0).toFixed(2), d:+Math.hypot(p.x-T.x,p.z-T.z).toFixed(2), keys:[...(L.keys||[])], drag:!!L.taskDrag, dlg:!!document.querySelector('.hud-dialogue'), camels:cams.filter(c=>Math.hypot(c[0]-T.x,c[1]-T.z)<8) } }, T)
/* סוגרים כל שיחה, ואז ניגשים מדרום */
await K.talk()
for (const [label, ox, oz] of [['מדרום', 0, 7], ['ממערב', -7, 0], ['מצפון', 0, -7]]) {
  say(`\n── גישה ${label}`)
  await K.walk(T.x+ox, T.z+oz, 1.5, 30); await K.talk()
  say('   נקודת פתיחה:', JSON.stringify(await probe()))
  for (let i=0;i<9;i++){
    await K.turn(T.x, T.z)
    const before = await probe()
    await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW'); await page.waitForTimeout(300)
    const after = await probe()
    const moved = Math.hypot(after.x-before.x, after.z-before.z).toFixed(2)
    say(`   צעד ${i+1}: ${after.x},${after.z} · d=${after.d} · זז ${moved} · y=${after.y} · שיחה=${after.dlg} · גמלים קרובים=${JSON.stringify(after.camels)}`)
    if (after.d < 2.6 || (+moved < 0.05 && i > 1)) break
  }
  say('   atTask:', await page.evaluate(()=>!!window.__ch1Live.atTask))
}
await page.screenshot({ path:"/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07/shots/v5-table-path.png" }).catch(()=>{})
await browser.close()
