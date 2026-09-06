/* מעבר רציף בכל תשע התחנות, בהקלטה אחת.
   מעבר בין אזורים הוא טעינת מסמך מלאה, אבל ההקלטה שייכת ל-context
   ולכן היא שורדת אותה — זו הקלטה אחת, לא תשע. */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
const outDir = 'scratchpad/video/_journey'
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 1120, height: 630 }, recordVideo: { dir: outDir, size: { width: 1120, height: 630 } } })
const page = await ctx.newPage()
const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)))
/* בלי לדלג על הפתיחה: „opening" הוא אחד משערי הליבה של רמות תימן,
   ובלעדיו השער קדימה נעול — כלומר מסע רציף חייב לראות אותו. */
const go = async (x, z) => page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const clear = async () => { for (let k=0;k<70;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) return; await page.keyboard.press('Space'); await page.waitForTimeout(170) } }
const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k) }
const settle = async () => {
  await page.waitForFunction(()=>window.__ch1Live, null, { timeout: 120000 })
  for (let i=0;i<30;i++){ await page.waitForTimeout(700)
    if (await page.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break }
  await page.waitForTimeout(2500); await clear()
}
const inward = (x,z,d=1.1) => { const m=Math.hypot(x,z)||1; return [x-(x/m)*d, z-(z/m)*d] }

await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'domcontentloaded' })
for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
  for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){ await b.click(); hit=true; break } }
  if (hit) break }
const ORDER = ['yemen-heights','night-camp','border-post','narrow-pass','loading-road','yathrib','monastery','mecca','exit']
for (const region of ORDER) {
  await settle()
  const w0 = await page.evaluate(()=>window.__ch1Where)
  console.log(`\n== ${w0.region} — ${w0.objective}`)
  // הליכה וריצה, כדי שהתנועה תיראה בהקלטה
  await hold(['KeyW'], 2200); await hold(['ShiftLeft','KeyW'], 2200); await hold(['KeyS'], 1200)
  // שיחת הפתיחה
  let w = await page.evaluate(()=>window.__ch1Where)
  for (const c of w.cast) {
    await go(c.x, c.z+1.7); await page.waitForTimeout(1400)
    /* לדמות אחת יכולות להיות כמה שיחות ליבה — לוחצים עד שנגמרו */
    for (let k=0;k<6;k++){
      await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
      const had = await page.evaluate(()=>!!document.querySelector('.hud-dialogue'))
      await clear()
      if (!had) break
    }
  }
  for (let i=0;i<6;i++){ w = await page.evaluate(()=>window.__ch1Where); if (w.stage!=='brief') break
    await page.keyboard.press('KeyR'); await page.waitForTimeout(600); await clear() }
  // עדויות
  w = await page.evaluate(()=>window.__ch1Where)
  for (const f of w.finds) { if (f.done) continue
    await go(...inward(f.x, f.z)); await page.waitForTimeout(900)
    if ((await page.evaluate(()=>window.__ch1Where.region)) !== region) break
    for (let k=0;k<3;k++){ const st=await page.evaluate((id)=>window.__ch1Where.finds.find(q=>q.id===id)?.done, f.id); if (st) break
      await page.keyboard.press('KeyE'); await page.waitForTimeout(700); await page.keyboard.press('Escape'); await page.waitForTimeout(300); await clear() } }
  // השער הפיזי של התחנה, אם יש לה כזה
  await page.evaluate(() => {
    const W = window
    if (W.__ch1LampSet && W.__ch1Where?.task) W.__ch1LampSet(W.__ch1Where.task.x, W.__ch1Where.task.z)
    if (W.__ch1TablePut) { W.__ch1TablePut(0); W.__ch1TablePut(1); W.__ch1TablePut(2) }
  })
  await page.waitForTimeout(3200)
  // המשימה
  w = await page.evaluate(()=>window.__ch1Where)
  if (w.task && !w.task.solved) {
    await go(w.task.x, w.task.z + 2.0); await page.waitForTimeout(6500)
    for (let round=0; round<8; round++) {
      const t = await page.evaluate(()=>window.__ch1Task); if (!t) break
      const item = t.props.find((p)=>!p.placed); if (!item) break
      const zones = t.bins && t.bins.length ? t.bins : [t.target]
      let ok = false
      for (const b of zones) {
        await page.waitForTimeout(1300)
        const snap = await page.evaluate(()=>window.__ch1Task)
        const fresh = snap?.props?.find((p)=>p.id===item.id)
        if (fresh) { item.x = fresh.x; item.y = fresh.y }
        await page.mouse.move(item.x, item.y); await page.mouse.down()
        for (let s=1;s<=10;s++){ await page.mouse.move(item.x+(b.x-item.x)*s/10, item.y+(b.y-item.y)*s/10); await page.waitForTimeout(50) }
        await page.mouse.up(); await page.waitForTimeout(1400)
        const w2 = await page.evaluate(()=>window.__ch1Where)
        if (w2.task?.solved) { ok = true; break }
        const snap2 = await page.evaluate(()=>window.__ch1Task)
        if (snap2?.props?.find((p)=>p.id===item.id)?.placed) { ok = true; break }
      }
      if (!ok) break
      if ((await page.evaluate(()=>window.__ch1Where)).task?.solved) break
    }
    // הפאנל כסיכום: E, ואז עונים עד שהתשובה מתקבלת
    for (let attempt = 0; attempt < 8; attempt++) {
      if ((await page.evaluate(()=>window.__ch1Where.task?.solved))) break
      if (!(await page.evaluate(()=>window.__ch1Live.atTask))) break
      if (!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) {
        await page.keyboard.press('KeyE'); await page.waitForTimeout(1100)
      }
      const btns = await page.$$('.ch1-task button')
      let clicked = false
      for (const b of btns) {
        const t = (await b.innerText().catch(()=>'')).trim()
        if (!t || t.includes('סגור') || t.includes('המשך') || t.includes('×')) continue
        await b.click({ timeout: 4000 }).catch(()=>{})
        clicked = true
        await page.waitForTimeout(1200)
        break
      }
      if (!clicked) break
    }
    for (let k=0;k<20;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.ch1-task')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(350) }
    await clear()
  }
  w = await page.evaluate(()=>window.__ch1Where)
  console.log(`   stage=${w.stage} task=${w.task ? w.task.solved : '—'} finds=${w.finds.filter(f=>f.done).length}/${w.finds.length}`)
  if (region === 'exit') break
  // אל השער
  const gate = await page.evaluate(()=>window.__ch1Where?.gate ?? null)
  const missing = await page.evaluate(()=>document.querySelector('.poi-gate-hold') ? 'held' : 'open')
  console.log('   gate:', gate ? `${gate.x},${gate.z}` : 'none', missing)
  if (gate) {
    const m = Math.hypot(gate.x, gate.z) || 1
    await go(gate.x - (gate.x/m)*3, gate.z - (gate.z/m)*3)
    await page.waitForTimeout(1500)
    await go(gate.x, gate.z)
  }
  await page.waitForTimeout(5000)
  const now = await page.evaluate(()=>window.__ch1Where?.region)
  console.log('   → travelled to', now)
  if (now === region) { console.log('   (stuck at gate — ending recording here)'); break }
}
await ctx.close(); await browser.close()
const f = fs.readdirSync(outDir).find((n)=>n.endsWith('.webm'))
if (f) { fs.renameSync(`${outDir}/${f}`, `${outDir}/journey.webm`); console.log('\nvideo →', `${outDir}/journey.webm`, fs.statSync(`${outDir}/journey.webm`).size, 'bytes') }
if (errs.length) console.log('errors', [...new Set(errs)].slice(0,5))
