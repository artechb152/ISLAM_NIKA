/* F לפני שהגיע שלב הפעולה — בכל תחנה שיש בה פעולה פיזית. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
for (const region of process.argv.slice(2)) {
  const page = await browser.newPage({ viewport:{width:1000,height:600} })
  await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
    for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await page.waitForFunction(()=>window.__ch1Where && window.__ch1Live, null, { timeout:180000 }).catch(()=>{})
  await page.waitForTimeout(6000)
  const snap = () => page.evaluate(()=>({
    stage: window.__ch1Where?.stage,
    hand: (document.querySelector('.hud-hand')?.textContent??'').trim().slice(0,50),
    held: window.__ch1Live?.handHeld ?? null,
    task: window.__ch1Task ? window.__ch1Task.props?.map(p=>p.placed) : null,
    lamp: (()=>{ const o=window.__ch1Scene?.getObjectByName('task:lamp'); if(!o) return null
      const v=o.getWorldPosition(new o.position.constructor()); return [+v.x.toFixed(2), +v.z.toFixed(2)] })(),
    table: window.__ch1TableAt ? window.__ch1TableAt().placed : null,
  }))
  const a = await snap()
  for (let i=0;i<3;i++){ await page.keyboard.press('KeyF'); await page.waitForTimeout(500) }
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400)
  await page.keyboard.press('KeyF'); await page.waitForTimeout(700)
  const b = await snap()
  const same = JSON.stringify(a.task)===JSON.stringify(b.task) && JSON.stringify(a.lamp)===JSON.stringify(b.lamp)
    && JSON.stringify(a.table)===JSON.stringify(b.table) && a.stage===b.stage
  console.log(`${region.padEnd(14)} שלב ${a.stage} → ${b.stage} · ביד: ${b.held ?? 'כלום'} · הוראה: ${b.hand||'אין'} · ${same ? '✔ שום דבר לא זז' : '✗ משהו השתנה'}`)
  if (!same) console.log('   לפני:', JSON.stringify(a), '\n   אחרי:', JSON.stringify(b))
  await page.close()
}
await browser.close()
