import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'] })
const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage()
await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Live, null, { timeout:150000 }).catch(()=>{})
// חכה שהסרט הפותח יופיע
for (let i=0;i<40;i++){ if (await page.evaluate(()=>!!document.querySelector('.hud-film, .hud-film-still'))) break; await page.waitForTimeout(600) }
await page.waitForTimeout(1200)
const st = await page.evaluate(()=>{
  const v=document.querySelector('video.hud-film')
  const still=document.querySelector('.hud-film-still')
  return v ? { kind:'video', w:v.videoWidth, h:v.videoHeight, poster:!!v.poster, t:+v.currentTime.toFixed(2) }
           : still ? { kind:'still' } : { kind:'none' }
})
console.log('opening film:', JSON.stringify(st))
await page.screenshot({ path:'scratchpad/shots/opening-film.png' })
await browser.close()
