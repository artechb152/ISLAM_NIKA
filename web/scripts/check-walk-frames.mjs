/* זמני פריים בהליכה, בדפדפן אמיתי עם GPU — הכלי שמצא את הגמגום.

   מה נמדד: עוטפים את requestAnimationFrame לפני שהמשחק עולה, ולכל פריים
   רושמים את המרווח מהפריים הקודם ואת זמן ה-JS של הקריאה. הולכים קדימה
   ארבע שניות, חוזרים אחורה, והולכים שוב על אותה דרך: הפרש בין המעבר
   הראשון לשני = עלות של „פעם ראשונה" (העלאות, מטמונים, קרני קרקע).

   מה זה מצא (22.9.2026): במנוע של ספארי המעבר הראשון הפיל 20–44 פריימים
   בארבע שניות והשני כמעט אפס. הסיבות, לפי הסדר שבו נמצאו: groundYAt ירה
   קרן מול 110 אלף משולשי הטרסה בכל מיקום חדש (4ms לקריאה), ראאווי החליף
   walk/idle 34 פעמים בשנייה (setState + רינדור), Game התרנדר 4–10 פעמים
   בשנייה בגלל המיני-מפה וכל עץ הסצנה איתו. אחרי התיקונים: אפס פריימים
   מעל 20ms בשלושה אזורים, JS מרבי 4ms.

   הרצה (שרת חייב לרוץ):
     BASE=http://localhost:3000 node scripts/check-walk-frames.mjs night-camp
     WEBKIT=1 node scripts/check-walk-frames.mjs border-post     # מנוע ספארי (npx playwright install webkit)
     CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/check-walk-frames.mjs mecca
   הדפדפן נפתח על המסך בכוונה — headless ב-SwiftShader רץ ב-3fps ואינו מודד כלום.
   יוצא עם קוד 1 אם יש יותר מ-3 פריימים מעל 20ms בלג כלשהו. */
import { existsSync } from 'node:fs'
import { chromium, webkit } from 'playwright-core'

const BASE = process.env.BASE || 'http://localhost:3000'
const REGION = process.argv[2] || 'night-camp'
const CHROME = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((p) => existsSync(p))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = process.env.WEBKIT
  ? await webkit.launch({ headless: false })
  : await chromium.launch({ executablePath: CHROME, headless: false, args: ['--window-position=0,0'] })
let bad = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    window.__fr = []
    const raf = window.requestAnimationFrame.bind(window)
    let last = 0
    window.requestAnimationFrame = (cb) => raf((t) => {
      const t0 = performance.now()
      cb(t)
      window.__fr.push([t0, performance.now() - t0, last ? t - last : 0])
      last = t
    })
  })
  await page.goto(`${BASE}/chapter1/play/?region=${REGION}`, { waitUntil: 'domcontentloaded' })
  const start = page.getByRole('button', { name: /התחילו|המשיכו/ })
  for (let t = 0; t < 40; t++) {
    if (await page.evaluate(() => !!document.querySelector('canvas'))) break
    if (await start.isVisible().catch(() => false)) await start.click({ timeout: 2000 }).catch(() => {})
    await wait(1000)
  }
  await wait(6000)
  /* סוגרים את שיחות ההגעה — הליכה בזמן שיחה חסומה ממילא */
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => !!document.querySelector('.hud-dialogue'))) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('.hud-dialogue button')].find((b) => /סיום|לעבודה|מספיק|המשך|הבנתי/.test(b.textContent))
        if (b) b.click()
        else document.querySelector('.hud-dialogue')?.click()
      })
    }
    await wait(900)
  }
  const leg = async (label, keys, secs) => {
    const mark = await page.evaluate(() => window.__fr.length)
    for (const k of keys) await page.keyboard.down(k)
    await wait(secs * 1000)
    for (const k of keys) await page.keyboard.up(k)
    const fr = (await page.evaluate(() => window.__fr)).slice(mark + 2)
    const byT = new Map()
    for (const [t0, js, iv] of fr) {
      const key = Math.round(t0)
      const e = byT.get(key) || { js: 0, iv }
      e.js += js
      byT.set(key, e)
    }
    const rows = [...byT.values()]
    const jsS = rows.map((r) => r.js).sort((a, b) => a - b)
    const ivS = rows.map((r) => r.iv).sort((a, b) => a - b)
    const q = (a, p) => a[Math.floor(a.length * p)].toFixed(1)
    const long = rows.filter((r) => r.iv > 20).length
    if (long > 3) bad++
    console.log(`${label.padEnd(8)} frames ${rows.length} · interval p95 ${q(ivS, 0.95)}ms max ${ivS.at(-1).toFixed(0)} · >20ms ${long} · JS median ${q(jsS, 0.5)} p95 ${q(jsS, 0.95)} max ${jsS.at(-1).toFixed(1)}`)
  }
  console.log(`\n${REGION} · ${process.env.WEBKIT ? 'WebKit' : 'Chrome'} · ${BASE}\n`)
  await leg('idle', [], 3)
  await leg('W #1', ['KeyW'], 4)
  await leg('S back', ['KeyS'], 4)
  await leg('W #2', ['KeyW'], 4)
} finally {
  await browser.close()
}
console.log(bad ? `\n✗ ${bad} legs with more than 3 frames over 20ms` : '\n✓ the walk holds its frame rate')
process.exit(bad ? 1 : 0)
