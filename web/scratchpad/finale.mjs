/* בודק את סוף הפרק: הסרטון ואז הכפתור לתרגול. */
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
const errs=[]; page.on('pageerror',(e)=>errs.push(e.message.slice(0,140)))
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1','1'); localStorage.setItem('ch1:arrived:exit:v1','1')
})
await page.goto('http://localhost:3000/chapter1?region=exit', { waitUntil: 'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(1000); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Live,null,{timeout:120000})
await page.waitForTimeout(4000)
// שמע את ראאווי ואסוף את העדויות
const go=async(x,z)=>page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const clear=async()=>{for(let k=0;k<80;k++){if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue'))))return;await page.keyboard.press('Space');await page.waitForTimeout(180)}}
let w=await page.evaluate(()=>window.__ch1Where)
const inward=(x,z,d=1.1)=>{const m=Math.hypot(x,z)||1;return [x-(x/m)*d, z-(z/m)*d]}
for(const f of w.finds){ await go(...inward(f.x,f.z)); await page.waitForTimeout(900)
  for(let k=0;k<3;k++){ const st=await page.evaluate((id)=>window.__ch1Where.finds.find(q=>q.id===id)?.done,f.id); if(st)break
    await page.keyboard.press('KeyE'); await page.waitForTimeout(700); await page.keyboard.press('Escape'); await page.waitForTimeout(300); await clear() } }
for(let i=0;i<12;i++){ await page.keyboard.press('KeyR'); await page.waitForTimeout(600); await clear()
  if (await page.evaluate(()=>!!document.querySelector('.ch1-film'))) break }
await page.waitForTimeout(9000)
const hasFilm = await page.evaluate(()=>!!document.querySelector('.ch1-film'))
console.log('film shown:', hasFilm)
if (hasFilm) {
  await page.screenshot({ path: 'scratchpad/shots/finale-film.png' })
  const st = await page.evaluate(()=>{const v=document.querySelector('.ch1-film-video');return {t:v.currentTime,dur:v.duration,tracks:v.textTracks.length,paused:v.paused}})
  console.log('video state:', JSON.stringify(st))
  for (const b of await page.$$('.ch1-film-bar button')) console.log('  button:', (await b.innerText()).trim())
  const skip = (await page.$$('.ch1-film-bar button')).at(-1)
  await skip.click(); await page.waitForTimeout(2500)
  await page.screenshot({ path: 'scratchpad/shots/finale-card.png' })
  const btns = await page.$$eval('.ch1-end-actions button', (e)=>e.map(b=>b.innerText.trim()))
  console.log('end card buttons:', JSON.stringify(btns))
}
console.log('errors', errs)
await browser.close()
