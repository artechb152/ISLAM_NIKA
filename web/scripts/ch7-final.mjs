/* פרק 7 — בדיקה סופית מקצה לקצה מול שרת הפיתוח. node scripts/ch7-final.mjs
   פותר את כל התרגול · בודק את המנגנונים אחרי תיקוני הסקירה · אין-JS · שגיאות קונסול */
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
const Q = JSON.parse(await readFile(new URL('../src/lib/chapter7/practice.json', import.meta.url), 'utf8')).questions
const R = new URL('../../concept/chapter7/shots/', import.meta.url).pathname
const b = await chromium.launch({ channel: 'chrome', headless: true })
const errs = [], out = {}
const watch = (p, t) => { p.on('pageerror', (e) => errs.push(`${t}: ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${t}: ${m.text().slice(0, 140)}`) }) }
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); watch(p, 'ch7')
await p.goto('http://localhost:3000/chapter7', { waitUntil: 'networkidle' })
await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ch7') || k === 'islam:chapter:7').forEach((k) => localStorage.removeItem(k)))
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800)
out.ask = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.ch7-ask')); return [cs.fontSize, cs.color] })
out.coda = await p.evaluate(() => getComputedStyle(document.querySelector('.ch7-coda')).color)
out.febRoles = await p.evaluate(() => [...document.querySelectorAll('.ch7-feb-year')].map((b) => b.getAttribute('role') + '/' + b.getAttribute('aria-pressed')))
await p.getByRole('button', { name: '2059' }).click(); await p.waitForTimeout(900)
out.feb2059 = await p.locator('.ch7-feb-cap').innerText()
await p.evaluate(() => document.querySelector('.ch7-feb').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await p.locator('.ch7-feb').screenshot({ path: R + 'd-feb-2059.png' })
out.nightPressed = await p.evaluate(() => document.querySelector('.ch7-night-sky').getAttribute('aria-pressed'))
await p.locator('.ch7-night-sky').click(); await p.waitForTimeout(1200); out.night = await p.locator('.ch7-night-state').innerText()
await p.evaluate(() => document.querySelector('.ch7-night').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await p.locator('.ch7-night').screenshot({ path: R + 'd-night-seen.png' })
await p.evaluate(() => document.getElementById('sighting').scrollIntoView({ block: 'start' })); await p.waitForTimeout(400); await p.screenshot({ path: R + 's-sighting.png' })
out.verseFont = await p.evaluate(() => getComputedStyle(document.querySelector('.ch7-verse-ar')).fontFamily)
/* scroll the whole chapter like a reader, then to the end */
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)) } })
await p.waitForTimeout(800)
out.read = await p.evaluate(() => localStorage.getItem('ch7:v2'))
/* practice, solved end to end */
await p.goto('http://localhost:3000/chapter7/practice', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
out.backHref = await p.locator('.gv-back').getAttribute('href')
const solved = []
for (const q of Q) {
  const sec = p.locator(`#p2-${q.id}`); await sec.scrollIntoViewIfNeeded()
  if (q.type === 'single' || q.type === 'multi') for (const o of q.options.filter((o) => o.right)) await sec.locator('.p2-option', { hasText: o.text }).first().click()
  else if (q.type === 'match') for (const pr of q.pairs) { await sec.locator('.p2-chip', { hasText: pr.right }).first().click(); await sec.locator('.p2-match-row', { hasText: pr.left }).locator('.p2-slot').click() }
  else if (q.type === 'order') for (let t = 0; t < q.steps.length; t++) for (let g = 0; g < 10; g++) { const items = await sec.locator('.p2-order-text').allInnerTexts(); const at = items.indexOf(q.steps[t]); if (at === t) break; await sec.locator('.p2-order li').nth(at).locator('button[aria-label="הזזה למעלה"]').click() }
  await sec.locator('.p2-check').click(); await p.waitForTimeout(120)
  solved.push(q.id + ':' + ((await sec.locator('.p2-feedback').getAttribute('class').catch(() => '')).includes('is-right') ? 'ok' : 'FAIL'))
}
out.practice = solved.join(' ')
await p.waitForTimeout(500)
out.doneFlag = await p.evaluate(() => localStorage.getItem('islam:chapter:7'))
await p.goto('http://localhost:3000/chapter7', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
out.chip = await p.locator('.chapter-end-done').count()
await p.goto('http://localhost:3000/chapters', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
out.card = await p.evaluate(() => [...document.querySelectorAll('a[href="/chapter7"]')].map((a) => a.innerText.replace(/\s+/g, ' ')).join(' | ').slice(0, 120))
/* no JS */
const ctx = await b.newContext({ javaScriptEnabled: false }); const n = await ctx.newPage()
await n.goto('http://localhost:3000/chapter7', { waitUntil: 'load' })
out.noJs = await n.evaluate(() => ({ dot: getComputedStyle(document.querySelector('.ch7-days-grid i')).opacity, gapNum: getComputedStyle(document.querySelector('.ch7-days-nums .is-gap')).opacity, faded: [...document.querySelectorAll('.chapter-article *')].filter((x) => x.children.length === 0 && x.textContent.trim() && +getComputedStyle(x).opacity < .5).length }))
await ctx.close()
console.log(JSON.stringify(out, null, 1))
console.log('console:', errs.length ? errs : 'clean')
await b.close()
