/* מקליט וידאו של מעבר אמיתי: הליכה, ריצה, שיחה, זוהר וגרירה. */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
const region = process.argv[2]
const outDir = `scratchpad/video/${region}`
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: outDir, size: { width: 1280, height: 720 } } })
const page = await ctx.newPage()
await page.addInitScript((r) => { localStorage.setItem('ch1:intro:v1','1'); localStorage.setItem(`ch1:arrived:${r}:v1`,'1') }, region)
await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(1000); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
  if (hit) break }
await page.waitForFunction(()=>window.__ch1Live, null, { timeout: 120000 })
await page.waitForTimeout(6000)
const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k)
  await page.waitForTimeout(ms)
  for (const k of keys) await page.keyboard.up(k)
}
// הליכה, ריצה, סיבוב מבט
await hold(['KeyW'], 3500)
await hold(['ShiftLeft','KeyW'], 3500)
await hold(['KeyA'], 1500)
const b = await (await page.$('canvas')).boundingBox()
await page.mouse.move(b.x+b.width/2, b.y+b.height/2); await page.mouse.down()
await page.mouse.move(b.x+b.width/2+300, b.y+b.height/2, { steps: 20 }); await page.mouse.up()
await page.waitForTimeout(1500)
await hold(['KeyS'], 2000)
// שיחה
const w = await page.evaluate(()=>window.__ch1Where)
if (w.cast[0]) {
  await page.evaluate((c)=>{const L=window.__ch1Live;L.player.x=c.x;L.player.z=c.z+1.7;L.lastDrag=performance.now()}, w.cast[0])
  await page.waitForTimeout(2500)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1500)
  for (let k=0;k<10;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) break; await page.keyboard.press('Space'); await page.waitForTimeout(700) }
}
await page.waitForTimeout(1500)
await ctx.close(); await browser.close()
const file = fs.readdirSync(outDir).find((f)=>f.endsWith('.webm'))
console.log(region, '→', `${outDir}/${file}`, fs.statSync(`${outDir}/${file}`).size, 'bytes')
