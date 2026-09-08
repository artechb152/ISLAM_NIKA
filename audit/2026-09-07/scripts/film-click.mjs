/* סרט הפתיחה: האם הכפתורים לחיצים מעל הווידאו, והאם הסרט נסגר. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Where, null, {timeout:180000})
for (let i=0;i<30;i++){ if (await page.evaluate(()=>!!document.querySelector('.hud-dialogue.has-film'))) break; await page.waitForTimeout(700) }
await page.waitForTimeout(1500)
const info = await page.evaluate(()=>{
  const btns=[...document.querySelectorAll('.hud-dialogue.has-film .hud-card-btn')]
  return btns.map(b=>{ const r=b.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2
    const el=document.elementFromPoint(cx,cy); return { t:b.textContent.trim(), under: el===b||b.contains(el) ? 'הכפתור' : (el?el.tagName+'.'+String(el.className).slice(0,20):'none') } }) })
console.log('כפתורי הסרט:', JSON.stringify(info))
for (let k=0;k<6;k++){ const b=await page.$('.hud-dialogue.has-film .hud-card-btn.is-primary') || await page.$('.hud-dialogue.has-film .hud-card-btn')
  if(!b) break; await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(600) }
console.log('אחרי לחיצות: סרט פתוח =', await page.evaluate(()=>!!document.querySelector('.hud-dialogue.has-film')), '· שיחה =', await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))
await page.screenshot({ path:'/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07/shots/v4-film.png' })
await browser.close()
