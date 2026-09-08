/* כל גוף גבוה מ-2.5 מ׳ בטווח 9 מ׳ מן השולחן — בלי תלות בשם. */
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
  const out = []
  sc.traverse(n => { if (!n.isMesh || !n.geometry?.attributes?.position) return
    const pos=n.geometry.attributes.position, m=n.matrixWorld.elements
    let mn={x:1e9,z:1e9,y:1e9}, mx={x:-1e9,z:-1e9,y:-1e9}
    for (let i=0;i<pos.count;i+=Math.max(1,Math.ceil(pos.count/300))) { const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i)
      const wx=m[0]*x+m[4]*y+m[8]*z+m[12], wy=m[1]*x+m[5]*y+m[9]*z+m[13], wz=m[2]*x+m[6]*y+m[10]*z+m[14]
      mn.x=Math.min(mn.x,wx);mx.x=Math.max(mx.x,wx);mn.z=Math.min(mn.z,wz);mx.z=Math.max(mx.z,wz);mn.y=Math.min(mn.y,wy);mx.y=Math.max(mx.y,wy) }
    const h = mx.y-mn.y; if (h < 2.5) return
    const cx=(mn.x+mx.x)/2, cz=(mn.z+mx.z)/2; const d=Math.hypot(cx-t.x, cz-t.z); if (d > 9) return
    let nm=''; for (let a=n; a && !nm; a=a.parent) if (a.name) nm=a.name
    const col = window.__ch1Statics.filter(c=>Math.hypot(c.x-cx,c.z-cz)<Math.max(1.5,(mx.x-mn.x)/2)).map(c=>c.r.toFixed(1))
    out.push({ name: nm.slice(0,40), centre:[+cx.toFixed(1),+cz.toFixed(1)], d:+d.toFixed(1), h:+h.toFixed(1), w:+(mx.x-mn.x).toFixed(1), dpt:+(mx.z-mn.z).toFixed(1), colliders: col }) })
  out.sort((a,b)=>a.d-b.d)
  return JSON.stringify(out.slice(0,8), null, 0)
}))
await browser.close()
