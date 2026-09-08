/* פוקוס מקלדת אמיתי — Tab, לא focus() תוכנתי, כי :focus-visible מבחין. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
for (const [name,url,wait] of [['מכה','http://localhost:3000/chapter1?region=mecca',12000],
                               ['תרגול','http://localhost:3000/chapter1/practice',4000],
                               ['דף הסיום','http://localhost:3000/chapter1?region=exit',4000]]) {
  const page = await browser.newPage({ viewport:{width:1440,height:900} })
  await page.goto(url, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
    for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await page.waitForTimeout(wait)
  console.log(`\n══ ${name}`)
  for (let i=0;i<7;i++){
    await page.keyboard.press('Tab'); await page.waitForTimeout(250)
    const f = await page.evaluate(()=>{ const el=document.activeElement
      if(!el || el===document.body) return null
      const cs=getComputedStyle(el); const r=el.getBoundingClientRect()
      return { t:(el.textContent||el.getAttribute('aria-label')||el.tagName).trim().slice(0,26),
        cls:String(el.className||'').slice(0,28),
        outline:`${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        shadow:cs.boxShadow.slice(0,50), w:Math.round(r.width), h:Math.round(r.height) } })
    if (!f) { console.log(`  Tab ${i+1}: אין אלמנט ממוקד`); continue }
    const visible = f.outline.includes('solid') || f.outline.includes('auto') || (f.shadow && f.shadow!=='none')
    console.log(`  Tab ${i+1}: ${visible?'✔':'✗'} ${f.cls||f.t} · ${f.w}×${f.h} · outline=${f.outline} · shadow=${f.shadow||'none'}`)
  }
  await page.close()
}
await browser.close()
