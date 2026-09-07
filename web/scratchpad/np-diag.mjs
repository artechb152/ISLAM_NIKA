import { chromium } from 'playwright-core'
const region = process.argv[2] || 'narrow-pass'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport:{width:900,height:520} })
page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0,200)))
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Live, null, { timeout:150000 })
for (let i=0;i<40;i++){ if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await page.waitForTimeout(700) }
await page.waitForTimeout(2500)
const P = () => page.evaluate(()=>({x:+window.__ch1Live.player.x.toFixed(2), z:+window.__ch1Live.player.z.toFixed(2), yaw:+window.__ch1Live.yaw.toFixed(2), keys:[...(window.__ch1Live.keys||[])], dlg: !!document.querySelector('.hud-dialogue'), top: (()=>{const e=document.elementFromPoint(450,260); return e? (e.className&&e.className.baseVal===undefined? String(e.className).slice(0,40) : e.tagName):'none'})()}))
console.log('start', JSON.stringify(await P()))
for (let n=0;n<4;n++){
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); 
  const mid = await P()
  await page.keyboard.up('KeyW'); await page.waitForTimeout(300)
  console.log(n, JSON.stringify(mid))
}
await browser.close()
