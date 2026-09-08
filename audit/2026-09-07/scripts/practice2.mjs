/* התרגול המסכם — שש שאלות, אחת בכל פעם. הבודק עונה כמו לומד: קודם
   ניסיון סביר, ואם נדחה — קורא את המשוב ומתקן. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true })
const page = await browser.newPage({ viewport:{width:1100,height:820} })
const errs=[]; page.on('pageerror', e=>errs.push(e.message.slice(0,160)))
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}
await page.goto('http://localhost:3000/chapter1/practice', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(3500)
const live = () => page.evaluate(()=>{
  const s = [...document.querySelectorAll('section')].find(e=>!e.hidden && e.querySelector('.p2-q-n, .p2-options, .p2-match, .p2-order'))
  const vis = (el) => el && !el.closest('[hidden]')
  return {
    count: (document.querySelector('.p1-steps-count')?.textContent ?? '').trim(),
    heading: (s?.querySelector('.section-heading')?.textContent ?? '').trim().slice(0,80),
    lead: (s?.querySelector('.p2-lead')?.textContent ?? '').trim().slice(0,220),
    hint: (s?.querySelector('.p2-hint')?.textContent ?? '').trim().slice(0,200),
    options: [...(s?.querySelectorAll('.p2-options button') ?? [])].map(b=>b.textContent.trim()).slice(0,8),
    bank: [...(s?.querySelectorAll('.p2-bank button') ?? [])].map(b=>b.textContent.trim()).slice(0,10),
    rows: [...(s?.querySelectorAll('.p2-match-row') ?? [])].map(r=>r.textContent.trim().slice(0,60)).slice(0,8),
    order: [...(s?.querySelectorAll('.p2-order-text') ?? [])].map(b=>b.textContent.trim()).slice(0,10),
    done: (s?.querySelector('.p2-done')?.textContent ?? '').trim().slice(0,200),
  }
})
for (let q=0; q<8; q++) {
  const st = await live()
  if (!st.count) break
  say(`\n── ${st.count} · ${st.heading}`)
  say(`   שאלה: ${st.lead}`)
  if (st.hint) say(`   רמז: ${st.hint}`)
  if (st.options.length) say(`   אפשרויות (${st.options.length}): ${JSON.stringify(st.options)}`)
  if (st.bank.length) say(`   מאגר גרירה (${st.bank.length}): ${JSON.stringify(st.bank)}`)
  if (st.order.length) say(`   סדר נוכחי: ${JSON.stringify(st.order)}`)
  if (st.rows.length) say(`   שורות התאמה: ${JSON.stringify(st.rows)}`)
  await page.screenshot({ path: `${OUT}/shots/practice-q${q+1}.png`, fullPage: true })
  /* מנסים לבדוק בלי לענות — האם התרגול מאפשר "בדיקה" ריקה */
  const check = await page.$('.p2-check button, button:has-text("בדיקה")')
  if (check) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(700)
    const after = await live()
    if (after.done) say(`   בדיקה ללא מענה → ${after.done}`) }
  /* מענה: לוחצים על האפשרות הראשונה, או ממיינים בקליק-קליק */
  const opts = await page.$$('.p2-options button')
  if (opts.length) { await opts[0].click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(600) }
  const bank = await page.$$('.p2-bank button')
  const rows = await page.$$('.p2-match-row')
  if (bank.length && rows.length) {
    for (const b of bank) { await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(250)
      for (const r of rows) { const slot = await r.$('button'); if (slot) { await slot.click({timeout:2500}).catch(()=>{}); break } }
      await page.waitForTimeout(250) }
  }
  if (check) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(900) }
  const fb = await live()
  if (fb.done) say(`   משוב: ${fb.done}`)
  const next = await page.$('button:has-text("לדלג")')
  if (next) { await next.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(900) }
  else break
}
say('\nסיום: ' + (await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(-260))))
if (errs.length) say('JS: ' + [...new Set(errs)].slice(0,3).join(' | '))
fs.writeFileSync(`${OUT}/logs/practice2.log`, lines.join('\n')+'\n')
await browser.close()
