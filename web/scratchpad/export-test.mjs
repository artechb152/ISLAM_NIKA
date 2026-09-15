import { chromium } from 'playwright-core'
const S = process.argv[2], B = process.argv[3] || 'http://localhost:8099/ISLAM_NIKA'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push('pageerror: ' + e.message))
p.on('requestfailed', r => errs.push('failed: ' + r.url().slice(-70)))
p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url().slice(-70)}`) })
await p.goto(B + '/chapter1/', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(2500)
const sh = await p.evaluate(() => document.documentElement.scrollHeight)
console.log('כניסה: h1 =', await p.textContent('h1'), '· גובה', sh, sh <= 900 ? '(מסך אחד)' : '(גולל!)')
console.log('כפתורים:', await p.$$eval('.p1-open-actions a,.p1-open-actions button', a => a.map(e => e.textContent.trim())))
console.log('תמונת הרקע נטענה:', await p.evaluate(async () => {
  const u = getComputedStyle(document.querySelector('.p1-open-media')).backgroundImage.match(/url\("?([^")]+)/)[1]
  const r = await fetch(u); return r.status + ' ' + u.slice(-40) }))
await p.screenshot({ path: `${S}/live-entry.png` })
await p.click('.p1-open-actions .ch2-end-link')
await p.waitForFunction(() => !!window.__ch1Live, null, { timeout: 180000 }).catch(() => console.log('המשחק לא עלה'))
console.log('אחרי הלחיצה →', p.url(), '· המשחק רץ:', await p.evaluate(() => !!window.__ch1Live))
await p.screenshot({ path: `${S}/live-play.png` })
await p.goto(B + '/chapter1/end/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(2000)
console.log('סיום: סרט במסך מלא?', !!(await p.$('.ch1-film')))
const skip = await p.$('.ch1-film button:has-text("דלג")'); if (skip) { await skip.click(); await p.waitForTimeout(1500) }
console.log('סיום: מקטעים', await p.$$eval('.article-section', a => a.length), '· h1', await p.textContent('h1'))
await p.goto(B + '/chapter1/practice/', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(2000)
console.log('תרגול: שאלות גלויות', await p.$$eval('.article-section.p2-q', a => a.filter(e => !e.hidden).length))
console.log('שגיאות:', errs.length, errs.slice(0, 6))
await b.close()
