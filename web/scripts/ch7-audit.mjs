/* פרק 7 — סבב בדיקה מלא מול שרת הפיתוח. node scripts/ch7-audit.mjs
   בלי JS · הפחתת תנועה · 1024/1920 · פיקסלים לבנים · חיפוש · מחברת · חדר המבחנים · מקלדת */
import { chromium } from 'playwright-core'
const R = new URL('../../concept/chapter7/shots/', import.meta.url).pathname
const URL7 = 'http://localhost:3000/chapter7'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const out = {}, errs = []
const watch = (p, tag) => { p.on('pageerror', (e) => errs.push(`${tag}: ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${tag} ${m.type()}: ${m.text().slice(0, 160)}`) }) }

/* 1 · no JS: every word present, nothing invisible */
{
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(URL7, { waitUntil: 'load' })
  out.noJs = await p.evaluate(() => {
    const hidden = [...document.querySelectorAll('.chapter-article *')].filter((n) => n.children.length === 0 && n.textContent.trim() && (+getComputedStyle(n).opacity < 0.5 || getComputedStyle(n).visibility === 'hidden')).map((n) => n.className + ':' + n.textContent.trim().slice(0, 20))
    const dots = [...document.querySelectorAll('.ch7-days-grid i')].slice(0, 3).map((n) => getComputedStyle(n).opacity)
    return { hidden: hidden.slice(0, 8), dotOpacity: dots, words: document.querySelector('.chapter-article').innerText.length }
  })
  await p.screenshot({ path: R + 'x-nojs-days.png', clip: await p.evaluate(() => { const r = document.querySelector('.ch7-days').getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height } }), fullPage: true })
  await ctx.close()
}
/* 2 · reduced motion: nothing at opacity 0 */
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); watch(p, 'rm')
  await p.goto(URL7, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  out.reduced = await p.evaluate(() => ({ zero: [...document.querySelectorAll('[data-reveal], .ch7-days-grid i')].filter((n) => getComputedStyle(n).opacity === '0').length, video: getComputedStyle(document.querySelector('.ch6-hero-video')).display }))
  await p.close()
}
/* 3 · widths the earlier rounds skipped: 1024 (rail breakpoint), 1180, 1920 */
for (const w of [1024, 1180, 1920]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, reducedMotion: 'reduce' }); watch(p, String(w))
  await p.goto(URL7, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  out['w' + w] = await p.evaluate(() => {
    const col = document.querySelector('.chapter-article').getBoundingClientRect()
    const over = document.documentElement.scrollWidth - innerWidth
    const outside = [...document.querySelectorAll('.chapter-article p, .chapter-article h2, .chapter-article h3, .ch7-days, .ch7-feb, .ch7-night, .ch7-pair, .ch7-wheel, .ch7-verses')].filter((n) => { const r = n.getBoundingClientRect(); return r.right > col.right + 1 || r.left < col.left - 1 }).map((n) => n.className || n.tagName)
    return { overflow: over, colW: Math.round(col.width), outside }
  })
  for (const sel of ['#farewell', '.ch7-wheel', '#sacred']) {
    await p.evaluate((s) => { const n = document.querySelector(s); scrollTo(0, n.getBoundingClientRect().top + scrollY - 70) }, sel); await p.waitForTimeout(250)
    await p.screenshot({ path: R + `x-${w}-${sel.replace(/[#.]/g, '')}.png` })
  }
  await p.close()
}
/* 4 · white: neutral bright pixels in a full-page render (rule 34–35) vs chapter 5 */
for (const ch of [5, 7]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await p.goto(`http://localhost:3000/chapter${ch}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  const buf = await p.screenshot({ fullPage: true, type: 'png' })
  const res = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, img.width, img.height).data; let n = 0, white = 0; const rows = new Map()
    for (let i = 0; i < d.length; i += 16) { n++; const r = d[i], g = d[i + 1], bb = d[i + 2]; if (bb >= r && r > 200 && g > 200) { white++; const y = Math.floor(i / 4 / img.width); rows.set(Math.floor(y / 100) * 100, (rows.get(Math.floor(y / 100) * 100) ?? 0) + 1) } }
    return { pct: (100 * white / n).toFixed(3), hotRows: [...rows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4) }
  }, buf.toString('base64'))
  out['white' + ch] = res
  await p.close()
}
/* 5 · search reaches the wheel list and the verses; 6 · notebook; 7 · keyboard */
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); watch(p, 'kb')
  await p.goto(URL7, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  const box = p.locator('.chapter-site-header input').first()
  const hits = {}
  for (const q of ['נדידה', 'תוספת כפירה', 'מצרית', '2059']) { await box.fill(q); await p.waitForTimeout(500); hits[q] = await p.evaluate(() => (CSS.highlights?.get('chapter-find')?.size) ?? -1) }
  out.search = hits
  await box.fill(''); await p.keyboard.press('Escape')
  /* keyboard: tab to a wheel month and press Enter */
  await p.locator('.ch7-md').nth(9).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  out.keyboardWheel = await p.locator('.ch7-wheel-hub b').innerText()
  await p.locator('.ch7-feb-year').nth(2).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200)
  out.keyboardFeb = await p.locator('.ch7-feb-cap').innerText()
  await p.locator('.ch7-night-sky').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  out.keyboardNight = await p.locator('.ch7-night-state').innerText()
  out.focusRing = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)
  /* notebook: select a sentence and look for the floating button */
  await p.evaluate(() => { const el = document.querySelector('#hijri p'); el.scrollIntoView({ block: 'center' }); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange')); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })
  await p.waitForTimeout(600)
  out.notebookButton = await p.evaluate(() => [...document.querySelectorAll('button')].some((b) => /מחברת/.test(b.textContent) && b.offsetParent))
  await p.close()
}
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); watch(p, 'exams')
  await p.goto('http://localhost:3000/exams', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  out.exams = await p.evaluate(() => { const t = document.body.innerText; return { listsCh7: t.includes('לוח השנה ההג׳רי'), count: (t.match(/49/g) ?? []).length } })
  await p.screenshot({ path: R + 'x-exams.png' })
  await p.close()
}
console.log(JSON.stringify(out, null, 1))
console.log('console errors/warnings:', errs.length ? errs.slice(0, 12) : 'none')
await b.close()
