/* פרק 1 — שיחות וסרטון. בדיקת התנהגות בפועל, לא נוכחות בקוד. */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage({ viewport: { width: 1100, height: 700 } })
const say = console.log
await p.goto('http://localhost:3000/chapter1/play?region=yemen-heights', { waitUntil: 'domcontentloaded', timeout: 240000 })
await p.waitForSelector('.hud-dialogue', { timeout: 240000 })
await p.waitForTimeout(800)

/* 1 — הכפתור הוסר */
const btns = await p.$$eval('.hud-dialogue .hud-card-btn', a => a.map(e => e.textContent.trim()))
say('כפתורי החלונית:', JSON.stringify(btns))
say('  „לשורה הבאה" קיים? ' + (btns.some(t => t.includes('לשורה הבאה')) ? '✗ כן' : '✓ לא') +
    ' · „להשלמת השורה" קיים? ' + (btns.some(t => t.includes('להשלמת השורה')) ? '✗ כן' : '✓ לא'))
say('  שורת ההנחיה:', JSON.stringify(await p.$eval('.hud-dialogue-hint', e => e.textContent.trim()).catch(() => null)))

/* 2 — הסרטון: פקדים, השהיה, המשך מאותה נקודה */
const vid = await p.$('.hud-film-wrap video')
if (!vid) say('סרטון: אין וידאו בחלונית הזאת')
else {
  const ctl = await p.$$eval('.hud-film-btn', a => a.map(e => e.textContent.trim()))
  say('פקדי הסרטון:', JSON.stringify(ctl))
  const t = () => p.$eval('.hud-film-wrap video', v => ({ t: +v.currentTime.toFixed(2), paused: v.paused, muted: v.muted, dur: +(v.duration || 0).toFixed(1), err: v.error ? v.error.code : null, ready: v.readyState }))
  await p.waitForTimeout(1200)
  const a = await t()
  say('  התחלה:', JSON.stringify(a))
  const cycles = []
  for (let i = 0; i < 3; i++) {
    await p.$$eval('.hud-film-btn', a => a[0].click()); await p.waitForTimeout(500)   /* השהיה */
    const paused = await t()
    await p.waitForTimeout(700)
    const held = await t()                                               /* צריך לעמוד */
    await p.$$eval('.hud-film-btn', a => a[0].click()); await p.waitForTimeout(800)   /* המשך */
    const back = await t()
    cycles.push({ i: i + 1, עצר: paused.paused, נשאר: +(held.t - paused.t).toFixed(2), המשיך_מ: held.t, ואז: back.t, התקדם: +(back.t - held.t).toFixed(2) })
  }
  for (const c of cycles) say('  מחזור', JSON.stringify(c))
  /* האם הוא מגיע לסוף בלי להיתקע? */
  let last = (await t()).t, stalls = 0
  for (let i = 0; i < 26; i++) {
    await p.waitForTimeout(700)
    const n = (await t()).t
    if (n <= last + 0.02 && !(await t()).paused) stalls++
    last = n
    if (last > 0 && (await t()).dur && last >= (await t()).dur - 0.35) break
  }
  const fin = await t()
  say(`  הגיע ל-${fin.t}/${fin.dur} שניות · תקיעות בדרך: ${stalls} · שגיאה: ${fin.err}`)
  /* לחיצה על פקד הסרט לא מקדמת את השיחה */
  const before = await p.$eval('.hud-dialogue p.is-full', e => e.textContent.trim())
  await p.$$eval('.hud-film-btn', a => a[0].click()); await p.waitForTimeout(400)
  const after = await p.$eval('.hud-dialogue p.is-full', e => e.textContent.trim())
  say('  לחיצה על פקד הסרט קידמה את השיחה? ' + (before !== after ? '✗ כן' : '✓ לא'))
}

/* 3 — התקדמות: לחיצה אחת = שלב אחד, רווח אחד = שלב אחד */
async function stepOnce(how) {
  /* קודם משלימים את השורה הנוכחית, כדי שהקלט הבא יהיה „שלב" ולא „השלמה" */
  await p.evaluate(() => {
    const r = document.querySelector('.hud-reveal-rest')
    return r ? r.textContent.length : 0
  })
  for (let i = 0; i < 60; i++) {
    const rest = await p.$eval('.hud-reveal-rest', e => e.textContent.length).catch(() => 0)
    if (rest === 0) break
    await p.waitForTimeout(120)
  }
  const t0 = await p.$eval('.hud-dialogue p.is-full', e => e.textContent.trim()).catch(() => null)
  if (how === 'space') await p.keyboard.press('Space')
  else await p.$eval('.hud-dialogue', el => el.click())   /* לחיצה אמיתית על החלונית, בלי מלחמת hit-testing עם הקנבס */
  /* דוגמים 1.4 שניות וסופרים כמה טקסטים *שונים* הופיעו */
  const seen = new Set([t0])
  for (let i = 0; i < 24; i++) {
    await p.waitForTimeout(60)
    const t = await p.$eval('.hud-dialogue p.is-full', e => e.textContent.trim()).catch(() => null)
    if (t) seen.add(t)
  }
  return { from: (t0 || '').slice(0, 24), changes: seen.size - 1 }
}
for (const how of ['space', 'click', 'space', 'click']) {
  if (!(await p.$('.hud-dialogue'))) { say(`התקדמות ב-${how}: השיחה נסגרה`); break }
  const r = await stepOnce(how)
  say(`התקדמות ב-${how}: מ־"${r.from}…" · שלבים שהתחלפו: ${r.changes} ${r.changes === 1 ? '✓' : r.changes === 0 ? '(סוף השיחה / מסך בחירה)' : '✗ קפיצה כפולה'}`)
}
await b.close()
