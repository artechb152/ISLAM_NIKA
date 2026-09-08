/* ריצת בחינה מלאה: הרכבה → מענה על גיליון אחד → הגשה → ציון → סקירה →
   היסטוריה. מריצים פעם עם תשובות נכונות ופעם עם שגויות. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const MODE = process.argv[2] || 'right'
const browser = await chromium.launch({ channel:'chrome', headless:true })
const page = await browser.newPage({ viewport:{width:1180,height:940} })
const errs=[], failed=[]
page.on('pageerror', e=>errs.push(e.message.slice(0,160)))
page.on('requestfailed', q=>failed.push(q.url().slice(-60)))
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}
const bank = JSON.parse(fs.readFileSync('/Users/nikagreenbaum/ISLAM_NIKA/web/src/lib/exams/banks/ch1.json','utf8'))
const QS = (bank.questions||bank)

await page.goto('http://localhost:3000/exams', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('.xr-chapters button')) { const t=(await b.textContent()||'').trim()
  const on=(await b.getAttribute('aria-pressed'))==='true'; const want=/^0?1/.test(t)
  if (want!==on) await b.click({timeout:2000}).catch(()=>{}) }
const lens = await page.$$('.xr-lengths button'); if (lens.length) await lens[0].click().catch(()=>{})
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/shots/exam-01-setup.png`, fullPage: true })
await page.click('.xr-go').catch(()=>{})
await page.waitForTimeout(2000)
const n = await page.locator('section.xq').count()
say(`מבחן נבנה: ${n} שאלות`)
await page.screenshot({ path: `${OUT}/shots/exam-02-sheet-${MODE}.png`, fullPage: true })
const types = { single:0, multi:0, match:0, open:0, unknown:0 }
for (let i=0;i<n;i++){
  const sec = page.locator('section.xq').nth(i)
  const head = (await sec.locator('.xq-head').textContent() || '').replace(/\s+/g,' ').trim()
  const prompt = head.replace(/^\d+\s*פרק \d+\s*/,'').replace(/^שאלה פתוחה\s*/,'')
  const q = QS.find(x => prompt.startsWith(x.prompt.slice(0,32)) || x.prompt.startsWith(prompt.slice(0,32)))
  const hasTA = await sec.locator('textarea.xq-write').count()
  const opts = await sec.locator('.xq-options button').count()
  const bankBtns = await sec.locator('.xq-bank button').count()
  if (i < 3) say(`\nשאלה ${i+1}: "${prompt.slice(0,70)}" · סוג ${q?.type ?? '?'} · ${opts} אפשרויות · פתוחה=${!!hasTA}`)
  if (hasTA) { types.open++
    await sec.locator('textarea.xq-write').fill(MODE==='right' ? (q?.model ?? q?.ok ?? 'תשובה לפי מה שנלמד.') : 'לא יודע')
  } else if (bankBtns) { types.match++
    const pairs = q?.pairs ?? []
    for (let k=0;k<pairs.length;k++){
      const p = pairs[k]
      const want = MODE==='right' ? p.right : pairs[(k+1)%pairs.length].right
      const b = sec.locator('.xq-bank button', { hasText: want }).first()
      if (await b.count()) { await b.click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(120) }
      const row = sec.locator('.xq-row, .xq-pair, li', { hasText: p.left.slice(0,18) }).first()
      const slot = row.locator('button').last()
      if (await slot.count()) { await slot.click({timeout:2000}).catch(()=>{}); await page.waitForTimeout(120) }
    }
  } else if (opts) {
    if (q?.type === 'multi') types.multi++; else if (q?.type === 'single') types.single++; else types.unknown++
    const rights = (q?.options ?? []).filter(o=>o.right).map(o=>o.text)
    for (let k=0;k<opts;k++){
      const btn = sec.locator('.xq-options button').nth(k)
      const t = ((await btn.textContent())||'').trim()
      const isRight = rights.some(r => r.slice(0,28) === t.slice(0,28))
      const want = MODE==='right' ? isRight : (!isRight && k===0)
      if (want) { await btn.click({timeout:2500}).catch(()=>{}); await page.waitForTimeout(110) }
    }
  } else types.unknown++
}
say(`\nסוגים שנענו: ${JSON.stringify(types)}`)
await page.screenshot({ path: `${OUT}/shots/exam-03-answered-${MODE}.png`, fullPage: true })
await page.locator('.xr-go', { hasText: 'הגשה' }).first().click({timeout:5000}).catch(()=>{})
await page.waitForTimeout(1500)
const confirm = page.locator('.xr-confirm button, button:has-text("הגשה")').last()
if (await confirm.count()) { await confirm.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1500) }
const score = await page.evaluate(()=>({
  n: (document.querySelector('.xr-score-n')?.textContent??'').replace(/\s+/g,' ').trim(),
  line: (document.querySelector('.xr-score-line')?.textContent??'').replace(/\s+/g,' ').trim().slice(0,140),
  meta: (document.querySelector('.xr-score-meta')?.textContent??'').replace(/\s+/g,' ').trim().slice(0,140),
  warn: (document.querySelector('.xr-score-warn')?.textContent??'').replace(/\s+/g,' ').trim().slice(0,160),
}))
say(`\nציון (${MODE}): ${score.n} · ${score.line}`)
if (score.meta) say(`   ${score.meta}`)
if (score.warn) say(`   אזהרה: ${score.warn}`)
await page.screenshot({ path: `${OUT}/shots/exam-04-score-${MODE}.png`, fullPage: true })
/* סקירה: התשובה הנכונה מסומנת */
const marked = await page.evaluate(()=>({
  right: document.querySelectorAll('.xq-opt.is-right, .is-right').length,
  wrong: document.querySelectorAll('.xq-opt.is-wrong, .is-wrong').length }))
say(`סקירה: ${marked.right} מסומנות כנכונות · ${marked.wrong} כשגויות`)
/* ניסיון חוזר + היסטוריה */
const again = page.locator('.xr-go').first()
if (await again.count()) { say(`כפתור סיום: "${((await again.textContent())||'').trim()}"`); await again.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(1500) }
const hist = await page.evaluate(()=>[...document.querySelectorAll('.xr-hrow')].map(r=>r.textContent.replace(/\s+/g,' ').trim().slice(0,70)))
say(`היסטוריה: ${hist.length} רשומות${hist.length?' · '+hist[0]:''}`)
await page.screenshot({ path: `${OUT}/shots/exam-05-history-${MODE}.png`, fullPage: true })
say('שגיאות JS: ' + (errs.length ? [...new Set(errs)].slice(0,3).join(' | ') : '0'))
say('בקשות שנכשלו: ' + (failed.length ? [...new Set(failed)].slice(0,3).join(' | ') : '0'))
fs.writeFileSync(`${OUT}/logs/exam-${MODE}.log`, lines.join('\n')+'\n')
await browser.close()
