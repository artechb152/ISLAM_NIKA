const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:900,height:520} })
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Statics, null, {timeout:180000})
console.log(await page.evaluate(()=>{
  const t = window.__ch1Where.task; const R = 0.5
  const near = window.__ch1Statics.map(c=>({x:+c.x.toFixed(1), z:+c.z.toFixed(1), r:+c.r.toFixed(2), d:+Math.hypot(c.x-t.x,c.z-t.z).toFixed(2)}))
    .filter(c=>c.d < 6).sort((a,b)=>a.d-b.d)
  /* הנקודה הקרובה ביותר לשולחן שרגל יכולה לעמוד בה */
  let best=99, bx=0, bz=0
  for (let a=0;a<360;a+=5) for (let d=0.4; d<7; d+=0.1) {
    const x=t.x+Math.cos(a*Math.PI/180)*d, z=t.z+Math.sin(a*Math.PI/180)*d
    if (window.__ch1Statics.every(c=>Math.hypot(c.x-x,c.z-z)>=c.r+R)) { if (d<best){best=d;bx=x;bz=z} break } }
  return JSON.stringify({ task:{x:t.x,z:t.z}, nearest:{d:+best.toFixed(2), x:+bx.toFixed(1), z:+bz.toFixed(1)}, colliders: near.slice(0,10) }, null, 1)
}))
await browser.close()
