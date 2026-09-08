/* התרגול המסכם — כל שש השאלות, בתוך החלק הגלוי בלבד. השאלות המוסתרות
   נשארות ב-DOM, ולכן כל בורר חייב להיות ממוקד ל-section שאינו hidden. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true })
const page = await browser.newPage({ viewport:{width:1180,height:900} })
const errs=[]; page.on('pageerror', e=>errs.push(e.message.slice(0,160)))
const failed=[]; page.on('requestfailed', q=>failed.push(q.url().slice(-70)))
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}
await page.goto('http://localhost:3000/chapter1/practice', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(3000)
const S = () => page.locator('section.p2-q:not([hidden])').first()
const info = () => page.evaluate(()=>{
  const s=[...document.querySelectorAll('section.p2-q')].find(e=>!e.hidden)
  if(!s) return null
  return {
    n: (s.querySelector('.p1-steps-count')?.textContent??'').trim(),
    title: (s.querySelector('h2')?.textContent??'').trim().slice(0,90),
    options: [...s.querySelectorAll('.p2-options button')].map(b=>({t:b.textContent.trim().slice(0,60), on:b.className.includes('is-')})),
    bank: [...s.querySelectorAll('.p2-bank button')].map(b=>b.textContent.trim().slice(0,40)),
    rows: [...s.querySelectorAll('.p2-match-row')].map(r=>r.textContent.trim().slice(0,70)),
    order: [...s.querySelectorAll('.p2-order-text')].map(b=>b.textContent.trim().slice(0,50)),
    done: (s.querySelector('.p2-done')?.textContent??'').trim().slice(0,220),
    hint: (s.querySelector('.p2-hint')?.textContent??'').trim().slice(0,160),
    solved: s.className.includes('is-solved'),
  }})
for (let q=0; q<7; q++) {
  const st = await info(); if (!st) break
  say(`\n── ${st.n} · ${st.title}`)
  if (st.hint) say(`   רמז: ${st.hint}`)
  if (st.options.length) say(`   בחירה (${st.options.length}): ${JSON.stringify(st.options.map(o=>o.t))}`)
  if (st.bank.length) say(`   מאגר (${st.bank.length}): ${JSON.stringify(st.bank)}`)
  if (st.order.length) say(`   סדר: ${JSON.stringify(st.order)}`)
  if (st.rows.length) say(`   שורות: ${st.rows.length}`)
  await page.screenshot({ path: `${OUT}/shots/practice-q${q+1}-open.png`, fullPage: true })
  /* בדיקה לפני מענה */
  const check = S().locator('button.p2-check').first()
  if (await check.count()) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(700)
    const a = await info(); if (a?.done) say(`   בדיקה ללא מענה: ${a.done}`) }
  /* מענה — לפי סוג השאלה, בעכבר ובמקלדת */
  const solveOne = async () => {
    const a0 = await info(); if (!a0) return
    /* סדר: הרמה במקלדת (רווח) והזזה בחצים, עד שהסדר נכון */
    if (a0.order.length) {
      const want = ['רמות תימן','תחנת הגבול','המעבר הצר','ית׳רב','מכה']
      for (let pass=0; pass<6; pass++) {
        const cur = (await info()).order
        let moved = false
        for (let target=0; target<want.length; target++) {
          const idx = cur.findIndex(t => t.includes(want[target]))
          if (idx < 0 || idx === target) continue
          const item = S().locator('.p2-order li, .p2-order [role="button"]').nth(idx)
          await item.focus().catch(()=>{})
          await page.keyboard.press('Space'); await page.waitForTimeout(200)
          const steps = idx - target
          for (let m=0; m<Math.abs(steps); m++) {
            await page.keyboard.press(steps > 0 ? 'ArrowUp' : 'ArrowDown'); await page.waitForTimeout(180)
          }
          await page.keyboard.press('Space'); await page.waitForTimeout(200)
          moved = true
          break
        }
        if (!moved) break
      }
      if (await check.count()) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(800) }
      const r = await info(); if (r?.done) say(`   משוב: ${r.done}`)
      return
    }
    /* התאמה: לומד שהבין יודע איזו תחנה שייכת לכל שורה. עונים נכון,
       ומודדים שהמשוב והפתרון עובדים. */
    if (a0.bank.length) {
      const KEY = [
        ['שתי אימפריות', 'תחנת הגבול'],
        ['שבטים נוודים', 'המעבר הצר'],
        ['משי ותבלינים', 'הדרך וההעמסה'],
        ['שוק משותף', 'ית׳רב'],
        ['נצרות שהגיעה', 'המנזר'],
        ['הכעבה', 'מכה'],
      ]
      /* קודם תשובה שגויה אחת, כדי לראות משוב */
      const first = S().locator('.p2-bank button').first()
      await first.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(200)
      const wrongRow = S().locator('.p2-match-row button').nth(1)
      if (await wrongRow.count()) { await wrongRow.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(200) }
      if (await check.count()) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(700) }
      const w = await info(); if (w?.done) say(`   משוב על טעות: ${w.done.slice(0,140)}`)
      /* מפנים ואז עונים נכון */
      for (let x=0; x<6; x++) { const sl = S().locator('.p2-match-row button').nth(x)
        if (await sl.count()) { await sl.click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(120) } }
      for (const [rowKey, ans] of KEY) {
        const bank = S().locator('.p2-bank button', { hasText: ans }).first()
        if (!(await bank.count())) continue
        await bank.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(200)
        const rows = S().locator('.p2-match-row')
        const n = await rows.count()
        for (let r=0; r<n; r++) {
          const txt = (await rows.nth(r).textContent()) || ''
          if (txt.includes(rowKey)) { await rows.nth(r).locator('button').first().click({timeout:2500}).catch(()=>{}); break }
        }
        await page.waitForTimeout(180)
      }
      if (await check.count()) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(900) }
      const r2 = await info()
      say(`   אחרי מענה נכון: ${r2?.solved?'נפתרה':'לא נפתרה'} · ${(r2?.done||'').slice(0,120)}`)
      return
    }
    /* בחירה יחידה או מרובה — עונים לפי הבנה, ואחרי טעות אחת מכוונת */
    const RIGHT = {
      'empires': ['הביזנטית מצפון־מערב'],
      'scope': ['שמישהו שהחזיק ספרים'],
      'yathrib': ['הדין והדת'],
      'build': ['הנרתיק לספר', 'הכתובת על אבן המנזר', 'האבן הניצבת', 'אשפת החיצים'],
    }
    const sec = await page.evaluate(()=>{
      const s=[...document.querySelectorAll('section.p2-q')].find(e=>!e.hidden); return s?s.id.replace('p1-',''):'' })
    const want = RIGHT[sec] || []
    const nOpt = await S().locator('.p2-options button').count()
    /* טעות מכוונת ראשונה */
    for (let i=0;i<nOpt;i++){
      const t = (await S().locator('.p2-options button').nth(i).textContent()) || ''
      if (!want.some(w=>t.includes(w))) { await S().locator('.p2-options button').nth(i).click({timeout:2500}).catch(()=>{}); break }
    }
    if (await check.count()) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(700) }
    const w2 = await info(); if (w2?.done) say(`   משוב על טעות: ${w2.done.slice(0,150)}`)
    /* ואז נכון */
    for (let i=0;i<nOpt;i++){
      const btn = S().locator('.p2-options button').nth(i)
      const t = (await btn.textContent()) || ''
      const shouldBe = want.some(w=>t.includes(w))
      const cls = (await btn.getAttribute('class')) || ''
      const on = cls.includes('is-on') || (await btn.getAttribute('aria-pressed')) === 'true'
      if (shouldBe !== on) { await btn.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(180) }
    }
    if (await check.count()) { await check.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(800) }
    const r3 = await info()
    say(`   אחרי מענה נכון: ${r3?.solved?'נפתרה':'לא נפתרה'} · ${(r3?.done||'').slice(0,140)}`)
  }
  await solveOne()
  const fin = await info()
  say(`   מצב: ${fin?.solved ? 'נפתרה' : 'לא נפתרה'}`)
  await page.screenshot({ path: `${OUT}/shots/practice-q${q+1}-after.png`, fullPage: true })
  const next = S().locator('.p1-steps button.is-primary')
  if (await next.count() && !(await next.isDisabled())) { await next.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(800) }
  else { say('   אין „הבאה" — סוף הרצף'); break }
}
say('\nסיום: ' + (await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(-300))))
await page.screenshot({ path: `${OUT}/shots/practice-end.png`, fullPage: true })
if (errs.length) say('JS: ' + [...new Set(errs)].slice(0,3).join(' | '))
if (failed.length) say('בקשות שנכשלו: ' + [...new Set(failed)].slice(0,3).join(' | '))
fs.writeFileSync(`${OUT}/logs/practice3.log`, lines.join('\n')+'\n')
await browser.close()
