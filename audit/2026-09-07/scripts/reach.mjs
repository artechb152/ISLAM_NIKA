/* האם אפשר להגיע אל כל עדות ואל התחנה בהליכה — קו ישר וחלופות בזווית. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const region = process.argv[2]
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:700,height:440} })
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Statics, null, { timeout:150000 })
await page.waitForTimeout(6000)
console.log(await page.evaluate(() => {
  const W = window.__ch1Where, C = window.__ch1Statics, L = window.__ch1Live
  const R = 0.45
  const blocked = (a, b) => { const dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)||1
    const ux=dx/len, uz=dz/len; const hit=[]
    for (const c of C) { const px=c.x-a.x, pz=c.z-a.z; const t=px*ux+pz*uz
      if (t<0||t>len) continue
      const perp=Math.hypot(px-ux*t, pz-uz*t)
      if (perp < c.r + R) hit.push({at:+t.toFixed(1), r:c.r, deep:+(c.r+R-perp).toFixed(2), x:+c.x.toFixed(1), z:+c.z.toFixed(1)}) }
    return hit }
  /* גם מסלול עוקף: 12 נקודות ביניים סביב המכשול */
  const reachable = (from, to) => {
    if (blocked(from,to).length === 0) return 'קו ישר פנוי'
    for (let a=0;a<16;a++){ const ang=(a/16)*Math.PI*2
      for (const d of [3,6,9,12]) {
        const mid = { x: from.x + Math.cos(ang)*d, z: from.z + Math.sin(ang)*d }
        if (blocked(from,mid).length===0 && blocked(mid,to).length===0) return `דרך נקודה ${mid.x.toFixed(1)},${mid.z.toFixed(1)}`
      } }
    return 'לא נמצא מסלול'
  }
  const from = { x: L.player.x, z: L.player.z }
  const out = []
  for (const f of W.finds) out.push(`עדות ${f.id} (${Math.hypot(f.x-from.x,f.z-from.z).toFixed(1)} מ'): ${reachable(from,{x:f.x,z:f.z})} | חוסמים בקו: ${JSON.stringify(blocked(from,{x:f.x,z:f.z}).slice(0,3))}`)
  if (W.task) out.push(`תחנה (${Math.hypot(W.task.x-from.x,W.task.z-from.z).toFixed(1)} מ'): ${reachable(from,{x:W.task.x,z:W.task.z})}`)
  for (const c of W.cast) out.push(`דמות ${c.who}: ${reachable(from,{x:c.x,z:c.z})}`)
  if (W.gate) out.push(`שער: ${reachable(from,{x:W.gate.x,z:W.gate.z})}`)
  return out.join('\n')
}))
await browser.close()
