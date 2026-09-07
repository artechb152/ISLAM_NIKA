/* מפריד זוגות חופפים: מזיז את הקטן שבשניים אל המקום הפנוי הקרוב,
   ובודק את המועמד מול התיבות שנמדדו בעולם — לא מול עיגול ה-JSON. */
import { open } from './lib-probe.mjs'
import fs from 'node:fs'
const FILE = { 'border-post': 'border', 'night-camp': 'camp' }
const FIXED = /hero|kaaba|terrain|butte|cliff|ridge|drywall|ruinwall|house-|bayt|mudtower|gate|wayhouse|monastery|sanctuary|collider|find-|task|altar|toll-scale|ansab/
for (const region of process.argv.slice(2)) {
  const { browser, page } = await open(region, { w: 800, h: 500 })
  await page.waitForFunction(()=>window.__ch1Audit, null, { timeout: 120000 }).catch(()=>{})
  let prev=-1
  for (let k=0;k<8;k++){ const n=await page.evaluate(()=>window.__ch1Audit?.counted??0); if(n===prev) break; prev=n; await page.waitForTimeout(2600) }
  const a = await page.evaluate(() => window.__ch1Audit)
  await browser.close()
  if (!a?.unapproved?.length) { console.log(region, '— clean'); continue }
  const box = new Map(a.sizes.map((s) => [s.name, s.box]))
  /* אותה אמת מידה של הביקורת: מרחק מרכזים מול סכום הרדיוסים. בלי זה
     הכלי בודק מועמדים מול תיבות של גושי בזלת בני 20 מטר ומסיק ש"אין
     מקום פנוי" בכל אזור סלעי. */
  const rad = new Map(a.sizes.map((s) => [s.name, s.r]))
  const touches = (cx, cz, r, name2) => {
    const b2 = box.get(name2)
    const x2 = (b2[0]+b2[3])/2, z2 = (b2[2]+b2[5])/2
    return Math.hypot(cx-x2, cz-z2) < r + (rad.get(name2) ?? 0.5) + 0.35
  }
  const vol = (b) => (b[3]-b[0])*(b[4]-b[1])*(b[5]-b[2])
  const inter = (b1, b2) => {
    const ox=Math.min(b1[3],b2[3])-Math.max(b1[0],b2[0])
    const oy=Math.min(b1[4],b2[4])-Math.max(b1[1],b2[1])
    const oz=Math.min(b1[5],b2[5])-Math.max(b1[2],b2[2])
    return (ox<=0||oy<=0||oz<=0) ? 0 : (ox*oy*oz)/Math.min(vol(b1),vol(b2))
  }
  const path = `src/lib/chapter1/${FILE[region] ?? region}-layout.json`
  const src = fs.readFileSync(path,'utf8')
  const ind = (src.match(/\n(\s+)"/)||[,'  '])[1].length
  const d = JSON.parse(src)
  let moved = 0
  for (const h of a.unapproved) {
    // מי הקטן, ומי מהם בכלל מותר להזיז
    const cands = [h.a, h.b].filter((n) => n.startsWith('prop:') && !FIXED.test(n))
    if (!cands.length) { console.log(`  ? ${h.a} ↔ ${h.b} — שניהם קבועים`); continue }
    const pick = cands.length === 1 ? cands[0]
      : (vol(box.get(cands[0])) <= vol(box.get(cands[1])) ? cands[0] : cands[1])
    const m = /^prop:(.+?)\.glb@(-?[\d.]+),(-?[\d.]+)$/.exec(pick)
    if (!m) { console.log('  ? cannot parse', pick); continue }
    const [, model, mx, mz] = m
    const p = d.props.find((q)=>q.model===model && Math.abs(q.x - +mx)<0.06 && Math.abs(q.z - +mz)<0.06)
    if (!p) { console.log('  ? not in layout', pick); continue }
    const b = box.get(pick)
    const cx=(b[0]+b[3])/2, cz=(b[2]+b[5])/2
    const hw=(b[3]-b[0])/2, hd=(b[5]-b[2])/2
    let best=null
    for (let step=0.5; step<=5 && !best; step+=0.3) {
      for (let k=0;k<28;k++){
        const t=(k/28)*Math.PI*2
        const nx=cx+Math.cos(t)*step, nz=cz+Math.sin(t)*step
        const cand=[nx-hw,b[1],nz-hd,nx+hw,b[4],nz+hd]
        const myR = rad.get(pick) ?? Math.min(hw,hd)
        let worst=0
        for (const [n2,b2] of box) {
          if (n2===pick) continue
          if (!touches(nx,nz,myR,n2)) continue
          worst=Math.max(worst, inter(cand,b2))
        }
        if (worst<0.03){ best={dx:nx-cx, dz:nz-cz, step}; break }
      }
    }
    if (!best){ console.log(`  ✗ ${pick} — אין מקום פנוי`); continue }
    p.x=+(p.x+best.dx).toFixed(3); p.z=+(p.z+best.dz).toFixed(3)
    moved++
    console.log(`  ${pick} → +${best.step.toFixed(1)}m  (${h.a} ↔ ${h.b}, ${Math.round(h.frac*100)}%)`)
  }
  fs.writeFileSync(path, JSON.stringify(d,null,ind)+(src.endsWith('\n')?'\n':''))
  console.log(`${region} — ${moved} props moved`)
}
