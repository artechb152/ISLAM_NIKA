/* למה המעבר במכה נתקע בצעד הראשון: מה קורה בדרך אל הסוחר. */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const errs=[]; page.on('pageerror', e=>errs.push(e.message.slice(0,200)))
page.on('console', m=>{ if (m.type()==='error') errs.push('console: '+m.text().slice(0,160)) })
const K = bind(page)
await K.start('mecca')
const w = await K.W()
console.log('שלב:', w.stage, '· דמויות:', JSON.stringify(w.cast), '· תחנה:', JSON.stringify(w.task))
console.log('שחקן:', JSON.stringify(await K.L()))
const c = w.cast[0]
for (let n=0;n<10;n++){
  const p = await K.L(); const d = Math.hypot(c.x-p.x, c.z-p.z)
  const dlg = await K.dlg()
  const st = await page.evaluate(()=>({ stage: window.__ch1Where.stage, atTask: !!window.__ch1Live.atTask, near: window.__ch1Live.nearWho ?? null,
    focus: !!window.__ch1Live.taskFocus, keys: [...(window.__ch1Live.keys||[])], hand: window.__ch1Live.handHeld ?? null }))
  console.log(`צעד ${n}: מרחק ${d.toFixed(1)} · שיחה ${dlg} · ${JSON.stringify(st)}`)
  if (d <= 2.2) break
  if (dlg) await K.talk()
  await K.turn(c.x, c.z)
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1400); await page.keyboard.up('KeyW'); await page.waitForTimeout(250)
}
await page.keyboard.press('KeyE'); await page.waitForTimeout(1200)
console.log('אחרי E: שיחה', await K.dlg(), '· טקסט:', await page.evaluate(()=>(document.querySelector('.hud-dialogue')?.innerText??'').replace(/\s+/g,' ').slice(0,80)))
console.log('שגיאות:', errs.length ? errs.slice(0,4).join(' | ') : '0')
await browser.close()
