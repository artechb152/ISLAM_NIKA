/* יציבות סדר האפשרויות: בחירה, משוב, ניקוד, focus, חזרה לשאלה —
   ואימות שהמיפוי בין האפשרות המוצגת לתשובה הנכונה נשמר. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const bank = JSON.parse(fs.readFileSync('/Users/nikagreenbaum/ISLAM_NIKA/web/src/lib/exams/banks/ch1.json','utf8'))
const QS = bank.questions || bank
const browser = await chromium.launch({ channel:'chrome', headless:true })
const page = await browser.newPage({ viewport:{width:1180,height:940} })
const errs=[]; page.on('pageerror', e=>errs.push(e.message.slice(0,140)))
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}
await page.goto('http://localhost:3000/exams', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('.xr-chapters button')) { const t=(await b.textContent()||'').trim()
  const on=(await b.getAttribute('aria-pressed'))==='true'; if((/^0?1/.test(t))!==on) await b.click().catch(()=>{}) }
const lens = await page.$$('.xr-lengths button'); if (lens.length) await lens[0].click().catch(()=>{})
await page.click('.xr-go').catch(()=>{}); await page.waitForTimeout(2000)

/* צילום הסדר של כל שאלה סגורה */
const snap = () => page.evaluate(()=>[...document.querySelectorAll('section.xq')].map(s=>({
  head: (s.querySelector('.xq-head')?.textContent??'').replace(/\s+/g,' ').trim().slice(0,60),
  opts: [...s.querySelectorAll('.xq-options button')].map(b=>b.textContent.trim().slice(0,40)),
})))
const eq = (a,b) => JSON.stringify(a.map(x=>x.opts)) === JSON.stringify(b.map(x=>x.opts))
const base = await snap()
const closed = base.filter(q=>q.opts.length)
say(`שאלות סגורות בגיליון: ${closed.length}`)
say(`סדר התחלתי נרשם · דוגמה: ${JSON.stringify(closed[0].opts.slice(0,2))}`)

/* 1. בחירת תשובה */
for (const sec of await page.$$('section.xq')) {
  const o = await sec.$$('.xq-options button'); if (o.length) { await o[0].click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(120) } }
say(`1. אחרי בחירת תשובה בכל שאלה: ${eq(base, await snap()) ? '✔ הסדר זהה' : '✗ הסדר השתנה'}`)

/* 2. focus */
for (let i=0;i<8;i++){ await page.keyboard.press('Tab'); await page.waitForTimeout(80) }
say(`2. אחרי שמונה מעברי focus: ${eq(base, await snap()) ? '✔ הסדר זהה' : '✗ הסדר השתנה'}`)

/* 3. שינוי בחירה — סימון וביטול */
for (const sec of await page.$$('section.xq')) {
  const o = await sec.$$('.xq-options button')
  if (o.length>1) { await o[1].click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(100)
    await o[1].click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(100) } }
say(`3. אחרי סימון וביטול: ${eq(base, await snap()) ? '✔ הסדר זהה' : '✗ הסדר השתנה'}`)

/* 4. גלילה וחזרה לשאלה הראשונה */
await page.evaluate(()=>window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(400)
await page.evaluate(()=>window.scrollTo(0,0))
await page.waitForTimeout(400)
say(`4. אחרי גלילה וחזרה: ${eq(base, await snap()) ? '✔ הסדר זהה' : '✗ הסדר השתנה'}`)

/* 5. עונים נכון, מגישים — ובודקים סדר + נכונות */
const secCount = await page.locator('section.xq').count()
for (let si=0; si<secCount; si++) {
  const sec = page.locator('section.xq').nth(si)
  const head = (await sec.locator('.xq-head').textContent()||'').replace(/\s+/g,' ').trim()
  const prompt = head.replace(/^\d+\s*פרק \d+\s*/,'').replace(/^שאלה פתוחה\s*/,'')
  const q = QS.find(x => prompt.startsWith(x.prompt.slice(0,32)))
  const ta = sec.locator('textarea.xq-write')
  if (await ta.count()) { await ta.fill(q?.model ?? 'תשובה.'); continue }
  const nb = await sec.locator('.xq-options button').count()
  const btns = []
  for (let bi=0; bi<nb; bi++) btns.push(sec.locator('.xq-options button').nth(bi))
  const rights = (q?.options ?? []).filter(o=>o.right).map(o=>o.text)
  for (const b of btns) {
    const t = ((await b.textContent())||'').trim()
    const want = rights.some(r=>r.slice(0,28)===t.slice(0,28))
    const on = (await b.getAttribute('aria-pressed'))==='true'
    if (want !== on) { await b.click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(100) } } }
const beforeSubmit = await snap()
await page.locator('.xr-go', { hasText:'הגשה' }).first().click({timeout:5000}).catch(()=>{}); await page.waitForTimeout(1000)
const cf = page.locator('.xr-confirm button').last()
if (await cf.count()) { await cf.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1600) }
const afterSubmit = await snap()
say(`5. אחרי הגשה ופתיחת משוב: ${eq(beforeSubmit, afterSubmit) ? '✔ הסדר זהה' : '✗ הסדר השתנה'}`)
const score = await page.evaluate(()=>({
  n:(document.querySelector('.xr-score-n')?.textContent??'').replace(/\s+/g,' ').trim(),
  line:(document.querySelector('.xr-score-line')?.textContent??'').replace(/\s+/g,' ').trim().slice(0,90) }))
say(`   ציון: ${score.n} · ${score.line}`)

/* 7. המיפוי נשמר: מה שסומן כנכון בסקירה הוא באמת הנכון במאגר */
const check = await page.evaluate(()=>{
  /* אחרי ההגשה הסקירה עשויה לשבת מחוץ ל-section.xq, ולכן מתחילים
     מן המסומנות עצמן ועולים אל הכותרת הקרובה. */
  const out = new Map()
  for (const el of document.querySelectorAll('.is-right')) {
    const sec = el.closest('section, li, article') || document.body
    const head = (sec.querySelector('.xq-head')?.textContent ?? sec.textContent ?? '').replace(/\s+/g,' ').trim().slice(0,50)
    if (!out.has(head)) out.set(head, [])
    out.get(head).push(el.textContent.trim())
  }
  return [...out].map(([head, marked]) => ({ head, marked }))
})
let ok=0, bad=0
for (const c of check) {
  if (!c.marked.length) continue
  const prompt = c.head.replace(/^\d+\s*פרק \d+\s*/,'')
  const q = QS.find(x => prompt.startsWith(x.prompt.slice(0,28)))
  if (!q) continue
  const truth = q.options.filter(o=>o.right).map(o=>o.text.slice(0,28)).sort()
  const shown = c.marked.map(t=>t.slice(0,28)).sort()
  if (JSON.stringify(truth)===JSON.stringify(shown)) ok++; else { bad++; say(`   ✗ ${q.id}: סומן ${JSON.stringify(shown)} · במאגר ${JSON.stringify(truth)}`) }
}
say(`7. מיפוי אפשרות→תשובה נכונה: ${ok} תואמות · ${bad} סטיות`)
/* 6. ההערכה העצמית משנה ניקוד — הסדר לא */
const partial = page.locator('button:has-text("עניתי חלקית")').first()
if (await partial.count()) { await partial.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(700) }
say(`6. אחרי שינוי ניקוד: ${eq(afterSubmit, await snap()) ? '✔ הסדר זהה' : '✗ הסדר השתנה'}`)

say('שגיאות JS: ' + (errs.length ? [...new Set(errs)].slice(0,2).join(' | ') : '0'))
fs.writeFileSync(`${OUT}/logs/shuffle-stable.log`, lines.join('\n')+'\n')
await browser.close()
