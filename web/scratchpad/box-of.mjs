import { chromium } from 'playwright-core'
const region = process.argv[2], pat = process.argv[3]
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:700,height:440} })
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Scene, null, { timeout:120000 })
await page.waitForTimeout(9000)
console.log(await page.evaluate((pat) => {
  const s = window.__ch1Scene; s.updateMatrixWorld(true)
  const out = []
  s.traverse(o => {
    if (!o.name || !new RegExp(pat).test(o.name)) return
    let mn = null, mx = null
    o.traverse(n => {
      if (!n.isMesh || !n.geometry?.attributes?.position) return
      const p = n.geometry.attributes.position, m = n.matrixWorld.elements
      for (let i=0;i<p.count;i+=Math.max(1,Math.ceil(p.count/300))) {
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i)
        const w = { x:m[0]*x+m[4]*y+m[8]*z+m[12], y:m[1]*x+m[5]*y+m[9]*z+m[13], z:m[2]*x+m[6]*y+m[10]*z+m[14] }
        if (!mn) { mn = {...w}; mx = {...w} }
        mn.x=Math.min(mn.x,w.x); mn.z=Math.min(mn.z,w.z); mn.y=Math.min(mn.y,w.y)
        mx.x=Math.max(mx.x,w.x); mx.z=Math.max(mx.z,w.z); mx.y=Math.max(mx.y,w.y)
      }
    })
    if (!mn) return
    const c = o.getWorldPosition(new o.position.constructor())
    const reach = Math.max(mx.x-c.x, c.x-mn.x, mx.z-c.z, c.z-mn.z)
    out.push(`${o.name} @${c.x.toFixed(1)},${c.z.toFixed(1)} רוחב ${(mx.x-mn.x).toFixed(2)}×${(mx.z-mn.z).toFixed(2)} · טווח מן המרכז ${reach.toFixed(2)}`)
  })
  return out.join('\n')
}, pat))
await browser.close()
