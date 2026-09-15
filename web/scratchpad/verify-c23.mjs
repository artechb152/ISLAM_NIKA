import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const say = console.log

/* ─────────── פרק 3 ─────────── */
for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080], [820, 700]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForTimeout(1800)
  await p.click('.c3-arrow.is-next'); await p.waitForTimeout(1500)     /* לפרוש פתוח */
  const before = await p.evaluate(() => {
    const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) } }
    const arr = [...document.querySelectorAll('.c3-arrow')].map(a => ({ cls: a.className.includes('is-next') ? 'next' : 'prev', x: Math.round(a.getBoundingClientRect().x), d: a.querySelector('path').getAttribute('d') }))
    return { book: q('.c3-book'), arrows: arr, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }
  })
  /* מצב קריאה — נבדק דרך מחלקת ה-fallback, כי fullscreen אמיתי חסום ב-headless */
  await p.evaluate(() => { document.querySelector('.c3-shell').classList.add('is-full'); window.dispatchEvent(new Event('resize')) })
  await p.waitForTimeout(900)
  const after = await p.evaluate(() => {
    const r = document.querySelector('.c3-book').getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), header: getComputedStyle(document.querySelector('.chapter-site-header')).display,
             overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }
  })
  const gain = (100 * (after.w / before.book.w - 1)).toFixed(1)
  const ar = (before.book.w / before.book.h).toFixed(3)
  const ar2 = (after.w / after.h).toFixed(3)
  const nx = before.arrows.find(a => a.cls === 'next'), pv = before.arrows.find(a => a.cls === 'prev')
  say(`${w}×${h} · ספר ${before.book.w}×${before.book.h} → מצב קריאה ${after.w}×${after.h} (+${gain}%) · יחס ${ar}→${ar2} · כותרת ${after.header} · גלישה אופקית ${before.overflowX || after.overflowX}`)
  say(`        „הבא" ב-x=${nx.x} חץ ${nx.d.startsWith('M14') ? '← שמאלה ✓' : '→ ימינה ✗'} · „הקודם" ב-x=${pv.x} חץ ${pv.d.startsWith('M10') ? '→ ימינה ✓' : '← שמאלה ✗'} · הבא משמאל לקודם: ${nx.x < pv.x ? '✓' : '✗'}`)
  await p.close()
}

/* מקשים + דפדוף */
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto('http://localhost:3000/chapter3', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(1500)
  const at = () => p.evaluate(() => document.querySelector('.c3-place-n').textContent.trim())
  const a0 = await at()
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1300); const a1 = await at()
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1300); const a2 = await at()
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1300); const a3 = await at()
  say(`מקשים: התחלה "${a0}" · ←"${a1}" · ←"${a2}" · →"${a3}"  (← מקדם, → חוזר)`)
  await p.click('.c3-arrow.is-next'); await p.waitForTimeout(1300); const a4 = await at()
  await p.click('.c3-arrow.is-prev'); await p.waitForTimeout(1300); const a5 = await at()
  say(`חצים: אחרי „הבא" "${a4}" · אחרי „הקודם" "${a5}"`)
  await p.close()
}

/* ─────────── פרק 2: פידבק לתשובה נכונה ─────────── */
{
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  await p.goto('http://localhost:3000/chapter2/practice', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(1800)
  const q = await p.$('.p2-options')
  if (!q) { say('פרק 2: לא נמצאה שאלת בחירה'); }
  else {
    /* בוחרים אפשרויות עד שהבדיקה מחזירה „נכון" — בלי לגעת בנתונים */
    let ok = false
    const opts = await p.$$('.p2-options li button')
    for (let i = 0; i < opts.length && !ok; i++) {
      const st = await p.evaluate(() => !!document.querySelector('.p2-feedback.is-right'))
      if (st) { ok = true; break }
      await opts[i].click()
      await p.click('.p2-check').catch(() => {})
      await p.waitForTimeout(400)
      ok = await p.evaluate(() => !!document.querySelector('.p2-feedback.is-right'))
      if (!ok) { await opts[i].click().catch(() => {}) }
    }
    const fb = await p.evaluate(() => {
      const e = document.querySelector('.p2-feedback')
      if (!e) return null
      const cs = getComputedStyle(e)
      const mark = e.querySelector('.p2-feedback-mark')
      return { right: e.classList.contains('is-right'), mark: mark ? mark.textContent.trim() : null,
               border: cs.borderColor, bg: cs.backgroundColor, text: e.textContent.trim().slice(0, 46) }
    })
    say('פרק 2 · תשובה נכונה: ' + JSON.stringify(fb))
  }
  await p.close()
}
await b.close()
