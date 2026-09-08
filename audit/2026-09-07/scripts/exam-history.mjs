/* הערכה עצמית לשאלה פתוחה, עדכון ניקוד, שמירה בהיסטוריה, ניסיון חוזר. */
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true })
const ctx = await browser.newContext({ viewport:{width:1180,height:940} })
const page = await ctx.newPage()
const errs=[]; page.on('pageerror', e=>errs.push(e.message.slice(0,140)))
const say=console.log
await page.goto('http://localhost:3000/exams', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(2200)
say('היסטוריה בפתיחה: ' + (await page.locator('.xr-hrow').count()) + ' רשומות · ריק: ' + (await page.locator('.xr-empty').count()))
for (const b of await page.$$('.xr-chapters button')) { const t=(await b.textContent()||'').trim()
  const on=(await b.getAttribute('aria-pressed'))==='true'; if ((/^0?1/.test(t))!==on) await b.click().catch(()=>{}) }
const lens = await page.$$('.xr-lengths button'); if (lens.length) await lens[0].click().catch(()=>{})
await page.click('.xr-go').catch(()=>{}); await page.waitForTimeout(1800)
/* עונים על הסגורות בלבד — האמת: חלק נכון וחלק לא */
const n = await page.locator('section.xq').count()
for (let i=0;i<n;i++){ const sec = page.locator('section.xq').nth(i)
  if (await sec.locator('textarea.xq-write').count()) { await sec.locator('textarea.xq-write').fill('תשובה חלקית לצורך ההערכה העצמית.'); continue }
  const opts = await sec.locator('.xq-options button').count()
  if (opts) await sec.locator('.xq-options button').first().click({timeout:2000}).catch(()=>{}) }
await page.locator('.xr-go', { hasText:'הגשה' }).first().click({timeout:5000}).catch(()=>{}); await page.waitForTimeout(1200)
const cf = page.locator('.xr-confirm button').last()
if (await cf.count()) { await cf.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1500) }
const before = await page.evaluate(()=>(document.querySelector('.xr-score-n')?.textContent??'').replace(/\s+/g,' ').trim())
say('ציון לפני הערכה עצמית: ' + before)
/* ההערכה העצמית — שלושת הכפתורים */
const selfBtns = await page.$$('.xq-self button, .xq-judge button, [class*="self"] button')
say('כפתורי הערכה עצמית שנמצאו: ' + selfBtns.length)
if (!selfBtns.length) {
  const all = await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>/מלא|חלק|לא ענ|החמצ/.test(t)))
  say('כפתורים לפי טקסט: ' + JSON.stringify(all.slice(0,8)))
  for (const t of ['מלא','חלקי']) { const b = page.locator(`button:has-text("${t}")`).first()
    if (await b.count()) { await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(600) } }
} else { for (const b of selfBtns.slice(0,2)) { await b.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(600) } }
const after = await page.evaluate(()=>(document.querySelector('.xr-score-n')?.textContent??'').replace(/\s+/g,' ').trim())
say('ציון אחרי הערכה עצמית: ' + after + (before!==after ? ' ✔ התעדכן' : ' — לא השתנה'))
await page.screenshot({ path: `${OUT}/shots/exam-06-self.png`, fullPage: true })
/* ההיסטוריה היא מסך נפרד, לא מסך ההרכבה */
const histBtn = page.locator('.xr-secondary', { hasText: 'כל המבחנים' }).first()
if (await histBtn.count()) { await histBtn.click({timeout:3000}).catch(()=>{}) }
else { const any = page.locator('button:has-text("היסטור")').first()
  if (await any.count()) await any.click({timeout:3000}).catch(()=>{}) }
await page.waitForTimeout(1800)
const rows = await page.locator('.xr-hrow').count()
say('היסטוריה אחרי מבחן: ' + rows + ' רשומות')
if (rows) say('   ' + (await page.locator('.xr-hrow').first().textContent()||'').replace(/\s+/g,' ').trim().slice(0,90))
/* מחיקה */
const del = page.locator('.xr-del').first()
if (await del.count()) { await del.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(600)
  const yes = page.locator('.xr-confirm button', { hasText: 'למחוק' }).first()
  if (await yes.count()) { await yes.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(800) }
  say('אחרי מחיקה: ' + (await page.locator('.xr-hrow').count()) + ' רשומות') }
await page.screenshot({ path: `${OUT}/shots/exam-07-history.png`, fullPage: true })
say('שגיאות JS: ' + (errs.length ? [...new Set(errs)].slice(0,2).join(' | ') : '0'))
await browser.close()
