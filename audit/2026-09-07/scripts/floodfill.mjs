/* האם כל יעד מחובר לנקודת ההתחלה בהליכה — מילוי שטח על רשת 0.4 מ׳
   מול הקוליידרים האמיתיים של האזור, ברדיוס שחקן 0.45. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const region = process.argv[2]
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:640,height:400} })
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Statics, null, { timeout:150000 })
await page.waitForTimeout(6000)
console.log(region + ':\n' + await page.evaluate(() => {
  const W = window.__ch1Where, C = window.__ch1Statics, L = window.__ch1Live
  const R = 0.45, STEP = 0.4, LIM = 70
  const free = (x, z) => { for (const c of C) if (Math.hypot(c.x-x, c.z-z) < c.r + R) return false; return true }
  const key = (i, j) => i + ',' + j
  const si = Math.round(L.player.x/STEP), sj = Math.round(L.player.z/STEP)
  const seen = new Set([key(si,sj)]); const q = [[si,sj]]
  while (q.length) { const [i,j] = q.shift()
    for (const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]) { const ni=i+di, nj=j+dj
      if (Math.abs(ni*STEP) > LIM || Math.abs(nj*STEP) > LIM) continue
      const k = key(ni,nj); if (seen.has(k)) continue
      if (!free(ni*STEP, nj*STEP)) continue
      seen.add(k); q.push([ni,nj]) } }
  const nearest = (tx, tz) => { let best = 1e9
    for (const k of seen) { const [i,j] = k.split(',').map(Number)
      const d = Math.hypot(i*STEP-tx, j*STEP-tz); if (d < best) best = d }
    return +best.toFixed(2) }
  const out = [`שטח נגיש: ${seen.size} תאים`]
  for (const f of W.finds) out.push(`  עדות ${f.id}: הנקודה הנגישה הקרובה ביותר ${nearest(f.x,f.z)} מ' (טווח בחינה 2.6)`)
  if (W.task) out.push(`  תחנה: ${nearest(W.task.x, W.task.z)} מ'`)
  for (const c of W.cast) out.push(`  דמות ${c.who}: ${nearest(c.x,c.z)} מ'`)
  if (W.gate) out.push(`  שער: ${nearest(W.gate.x,W.gate.z)} מ'`)
  return out.join('\n')
}))
await browser.close()
