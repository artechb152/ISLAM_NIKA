/* מה עומד סביב שולחן מכה: גופים גדולים מול רדיוס הקוליידר שלהם. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:900,height:520} })
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Scene && window.__ch1Statics, null, {timeout:180000})
await page.waitForTimeout(12000)
console.log(await page.evaluate(()=>{
  const t = window.__ch1Where.task; const sc = window.__ch1Scene; sc.updateMatrixWorld(true)
  const V = sc.position.constructor; const out = []
  sc.traverse(o => { if (!o.name || !/^prop:/.test(o.name)) return
    const p = o.getWorldPosition(new V()); const d = Math.hypot(p.x-t.x, p.z-t.z); if (d > 7) return
    let mn={x:1e9,z:1e9,y:1e9}, mx={x:-1e9,z:-1e9,y:-1e9}
    o.traverse(n=>{ if(!n.isMesh||!n.geometry?.attributes?.position) return; const pos=n.geometry.attributes.position, m=n.matrixWorld.elements
      for (let i=0;i<pos.count;i+=Math.max(1,Math.ceil(pos.count/200))) { const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i)
        const wx=m[0]*x+m[4]*y+m[8]*z+m[12], wy=m[1]*x+m[5]*y+m[9]*z+m[13], wz=m[2]*x+m[6]*y+m[10]*z+m[14]
        mn.x=Math.min(mn.x,wx);mx.x=Math.max(mx.x,wx);mn.z=Math.min(mn.z,wz);mx.z=Math.max(mx.z,wz);mn.y=Math.min(mn.y,wy);mx.y=Math.max(mx.y,wy) } })
    const reach = Math.max(mx.x-p.x, p.x-mn.x, mx.z-p.z, p.z-mn.z)
    const col = window.__ch1Statics.find(c=>Math.hypot(c.x-p.x,c.z-p.z)<0.2)
    out.push({ name:o.name.replace('prop:','').replace('.glb',''), at:[+p.x.toFixed(1),+p.z.toFixed(1)], d:+d.toFixed(1), h:+(mx.y-mn.y).toFixed(1), reach:+reach.toFixed(2), collider: col ? +col.r.toFixed(2) : null }) })
  out.sort((a,b)=>b.h-a.h)
  return JSON.stringify(out.slice(0,10), null, 0)
}))
await browser.close()
