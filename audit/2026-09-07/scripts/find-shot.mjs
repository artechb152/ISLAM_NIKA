/* צילום ממוקד של ראיה: הולכים אליה, מסובבים אליה, ומדווחים היכן היא
   על המסך — כדי לדעת מה בדיוק רואים. */
import fs from 'node:fs'
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const region = process.argv[2] || 'yathrib'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page)
await K.start(region)
const w = await K.W()
for (const [i,f] of w.finds.entries()) {
  for (const d of [8, 3.5]) {
    await K.walk(f.x, f.z, d, 24); await K.turn(f.x, f.z); await page.waitForTimeout(1500)
    const p = await page.evaluate(({x,z})=>{ const sc=window.__ch1Scene; const V=sc.position.constructor
      const v=new V(x,0.1,z); v.project(window.__ch1Camera)
      return { sx:Math.round((v.x*0.5+0.5)*innerWidth), sy:Math.round((-v.y*0.5+0.5)*innerHeight), onScreen:v.z<=1 && Math.abs(v.x)<1 && Math.abs(v.y)<1 } }, f)
    const pl = await K.L()
    const dist = Math.hypot(f.x-pl.x, f.z-pl.z).toFixed(1)
    console.log(`${region} · ${f.id} · ${dist} מ׳ · על המסך ${p.onScreen?'כן':'לא'} ב-${p.sx},${p.sy}`)
    const file = `${OUT}/shots/find-${region}-${i}-${d}m.png`
    await page.screenshot({ path: file })
    if (p.onScreen) await page.screenshot({ path: file.replace('.png','-crop.png'), clip:{ x:Math.max(0,p.sx-220), y:Math.max(0,p.sy-160), width:440, height:320 } })
  }
}
await browser.close()
