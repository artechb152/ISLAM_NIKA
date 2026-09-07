/* מוכיח לכל תחנה שהסדר נאכף: E לא פותח את מה שעוד לא הגיע תורו. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page, errors } = await open(region)
const go = async (x,z)=>page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const W = async () => {
  await page.waitForFunction(()=>window.__ch1Where, null, { timeout: 90000 }).catch(()=>{})
  return page.evaluate(()=>window.__ch1Where)
}
const opened = () => page.evaluate(()=>({
  task: !!document.querySelector('.ch1-task'),
  find: !!document.querySelector('.ch1-find-card, .hud-find'),
  talk: !!document.querySelector('.hud-dialogue'),
}))
const clear = async () => { for(let k=0;k<50;k++){ const o=await opened(); if(!o.talk&&!o.task&&!o.find) return
  await page.keyboard.press('Escape'); await page.waitForTimeout(180); await page.keyboard.press('Space'); await page.waitForTimeout(180) } }
const fails = []
let w = await W()
console.log(`== ${region} · שלב פתיחה: ${w.stage}`)

// 1) בשלב brief: E ליד המשימה לא פותח אותה
if (w.stage === 'brief' && w.task) {
  await go(w.task.x, w.task.z + 1.5); await page.waitForTimeout(1400)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
  if ((await opened()).task) fails.push('E פתח את המשימה לפני השיחה')
  else console.log('   ✓ E לפני השיחה אינו פותח את המשימה')
  await clear()
  // ולחיצה שנייה גם לא
  await page.keyboard.press('KeyE'); await page.waitForTimeout(700)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
  if ((await opened()).task) fails.push('לחיצה שנייה על E עקפה את השלב')
  else console.log('   ✓ לחיצה שנייה אינה עוקפת')
  await clear()
}
// 2) שמע את שיחת הפתיחה
for (const c of w.cast) { await go(c.x, c.z+1.7); await page.waitForTimeout(1200)
  for (let k=0;k<5;k++){ await clear(); await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
    if (!(await opened()).talk) break; await clear() } }
for (let i=0;i<8;i++){ w=await W(); if (w.stage!=='brief') break; await clear(); await page.keyboard.press('KeyR'); await page.waitForTimeout(700); await clear() }
w = await W(); console.log(`   אחרי השיחה: ${w.stage}`)

// 3) בשלב look/act: E ליד המשימה עדיין לא פותח את הפירוש
if (w.task && (w.stage === 'look' || w.stage === 'act')) {
  await go(w.task.x, w.task.z + 1.5); await page.waitForTimeout(1500)
  await clear()
  await page.keyboard.press('KeyE'); await page.waitForTimeout(800)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
  if ((await opened()).task) fails.push(`E פתח את הפירוש בשלב ${w.stage}`)
  else console.log(`   ✓ בשלב ${w.stage} E אינו פותח את הפירוש`)
  await clear()
}
// 4) בחן את העדויות
w = await W()
const inward=(x,z,d=1.1)=>{const m=Math.hypot(x,z)||1;return [x-(x/m)*d, z-(z/m)*d]}
for (const f of w.finds) { if (f.done) continue
  await go(...inward(f.x,f.z)); await page.waitForTimeout(800)
  if ((await W()).region !== region) break
  for (let k=0;k<3;k++){ const st=(await W()).finds.find(q=>q.id===f.id)?.done; if(st) break
    await clear(); await page.keyboard.press('KeyE'); await page.waitForTimeout(700); await clear() } }
w = await W()
console.log(`   עדויות: ${w.finds.filter(f=>f.done).length}/${w.finds.length} · שלב: ${w.stage}`)
console.log(fails.length ? `   ✗ ${fails.join(' | ')}` : '   ✓ ההיררכיה נאכפת')
if (errors.length) console.log('   JS:', [...new Set(errors)].slice(0,2))
await browser.close()
