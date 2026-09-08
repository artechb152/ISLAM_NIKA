/* אותה תחנה בשלוש רזולוציות — קריאות HUD, חפיפת טקסט, כפתורים שיורדים שורה. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT = '/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const region = process.argv[2] || 'border-post'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
for (const [w,h] of [[1440,900],[1024,640],[820,560]]) {
  const page = await browser.newPage({ viewport:{width:w,height:h} })
  await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
    for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await page.waitForFunction(()=>window.__ch1Where, null, {timeout:180000}).catch(()=>{})
  await page.waitForTimeout(9000)
  /* חפיפות בין אלמנטי HUD: זוגות של תיבות שנחתכות */
  const overlaps = await page.evaluate(()=>{
    const els = [...document.querySelectorAll('.hud-panel, .hud-objective, .ch1-task-note, .poi-marker, .hud-keys, .hud-dialogue, .ch1-minimap, [class*="hud-"]')]
      .filter(e => e.offsetWidth>0 && e.offsetHeight>0 && getComputedStyle(e).visibility!=='hidden')
    const boxes = els.map(e=>({c:e.className.toString().slice(0,40), r:e.getBoundingClientRect()}))
    const out = []
    for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++){
      const a=boxes[i].r, b=boxes[j].r
      const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left), oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)
      if (ox>8 && oy>8 && !boxes[i].c.includes(boxes[j].c.split(' ')[0]) ) out.push(`${boxes[i].c} × ${boxes[j].c} (${Math.round(ox)}×${Math.round(oy)})`)
    }
    const offscreen = boxes.filter(b => b.r.right > innerWidth+2 || b.r.left < -2 || b.r.bottom > innerHeight+2).map(b=>b.c)
    return { overlaps: out.slice(0,8), offscreen }
  })
  console.log(`${w}×${h}: חפיפות HUD ${overlaps.overlaps.length} ${JSON.stringify(overlaps.overlaps)} · מחוץ למסך ${JSON.stringify(overlaps.offscreen)}`)
  await page.screenshot({ path: `${OUT}/shots/viewport-${region}-${w}x${h}.png` })
  await page.close()
}
await browser.close()
