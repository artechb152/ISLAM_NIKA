/* התרגול המסכם — מעבר טבעי: קריאה, מענה, משוב, סיום. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT = '/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true })
const page = await browser.newPage({ viewport:{width:1100,height:760} })
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0,160)))
const lines = []; const say = (m) => { console.log(m); lines.push(m) }
await page.goto('http://localhost:3000/chapter1/practice', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${OUT}/shots/practice-01-open.png`, fullPage: true })
say('כותרת: ' + (await page.evaluate(()=>document.querySelector('h1,h2')?.textContent?.trim() ?? '')))
say('טקסט פתיחה: ' + (await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,300))))
for (let step=0; step<14; step++) {
  const q = await page.evaluate(()=>({
    question: (document.querySelector('.p1-q, .p1-question, [class*="question"]')?.textContent ?? '').trim().slice(0,160),
    buttons: [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean).slice(0,12),
    draggables: document.querySelectorAll('[draggable="true"], .p1-chip, [class*="chip"]').length,
    progress: (document.querySelector('.p1-progress, [class*="progress"]')?.textContent ?? '').trim().slice(0,60),
  }))
  say(`שלב ${step}: שאלה="${q.question}" · כפתורים=${JSON.stringify(q.buttons)} · גרירות=${q.draggables} · התקדמות="${q.progress}"`)
  await page.screenshot({ path: `${OUT}/shots/practice-${String(step+2).padStart(2,'0')}.png`, fullPage: true })
  /* בוחרים תמיד את האפשרות הראשונה שאינה ניווט — כמו לומד שמנחש — ובודקים שיש משוב */
  const opt = await page.$('.p1-options button, .p1-answers button, .hud-card-btn:not(.is-primary)')
  if (opt) { await opt.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(900)
    say('   משוב: ' + (await page.evaluate(()=>(document.querySelector('.p1-feedback, [class*="feedback"], [role="status"]')?.textContent ?? '').trim().slice(0,200)))) }
  const next = await page.$('button:has-text("הבא"), button:has-text("המשך"), button:has-text("לשאלה"), .hud-card-btn.is-primary')
  if (next) { await next.click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(900) }
  else if (!opt) { say('   אין כפתור המשך — עוצרים'); break }
}
say('סיום: ' + (await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(-300))))
if (errs.length) say('JS: ' + [...new Set(errs)].slice(0,3).join(' | '))
fs.writeFileSync(`${OUT}/logs/practice.log`, lines.join('\n')+'\n')
await browser.close()
