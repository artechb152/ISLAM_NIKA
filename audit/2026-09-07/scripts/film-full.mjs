/* מסך מלא: הסרט במסע מעל הכותרת, והסרט בדף הסיום ממלא את המסך. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const errs=[]; page.on('pageerror', e=>errs.push(e.message.slice(0,140)))
/* דף הסיום */
await page.goto('http://localhost:3000/chapter1?region=exit&from=mecca', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(4000)
const o = await page.evaluate(()=>{ const f=document.querySelector('.ch1-film'); const v=f?.querySelector('video'); const h=document.querySelector('.chapter-site-header')
  const r=f?.getBoundingClientRect(); const top = document.elementFromPoint(720, 20)
  return { film: r?`${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`:'אין', video: v?`${v.videoWidth}×${v.videoHeight} t=${v.currentTime.toFixed(1)}`:'אין',
    headerVisible: h ? (top && (top===h || h.contains(top)) ? 'כן — מעל הסרט' : 'מתחת לסרט') : 'אין כותרת', vw:innerWidth, vh:innerHeight } })
console.log('דף הסיום — סרט:', JSON.stringify(o))
await page.screenshot({ path:`${OUT}/shots/v7-outro-film.png` })
const skip = page.locator('.ch1-film .hud-card-btn.is-primary').first()
if (await skip.count()) { await skip.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1500) }
console.log('אחרי „דלגו": דף =', await page.evaluate(()=>!!document.querySelector('.ch1-outro')), '· סרט =', await page.evaluate(()=>!!document.querySelector('.ch1-film')))
await page.screenshot({ path:`${OUT}/shots/v7-outro-page.png`, fullPage:true })
/* הסרט במסע */
await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where, null, {timeout:180000})
for (let i=0;i<30;i++){ if (await page.evaluate(()=>!!document.querySelector('.hud-dialogue.has-film'))) break; await page.waitForTimeout(700) }
await page.waitForTimeout(1500)
const j = await page.evaluate(()=>{ const d=document.querySelector('.hud-dialogue.has-film'); const h=document.querySelector('.chapter-site-header')
  const r=d?.getBoundingClientRect(); const top=document.elementFromPoint(720, 20)
  return { panel: r?`${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`:'אין', z: d?getComputedStyle(d).zIndex:null,
    headerOnTop: h && top && (top===h || h.contains(top)) ? 'כן — הכותרת מעל' : 'לא — הסרט מכסה', btnClickable: (()=>{ const b=document.querySelector('.hud-dialogue.has-film .hud-card-btn'); if(!b) return 'אין'; const br=b.getBoundingClientRect(); const e=document.elementFromPoint(br.left+br.width/2, br.top+br.height/2); return e===b||b.contains(e)?'כן':'לא' })() } })
console.log('סרט במסע:', JSON.stringify(j))
await page.screenshot({ path:`${OUT}/shots/v7-journey-film.png` })
console.log('שגיאות JS:', errs.length ? errs.slice(0,2).join(' | ') : '0')
await browser.close()
