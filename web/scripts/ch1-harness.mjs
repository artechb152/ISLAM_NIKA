/* רתמת דפדפן לפרק 1 — עזרים משותפים לבדיקות ידניות מול שרת הפיתוח.
   חיה כאן ולא בתיקייה זמנית כי היא נמחקה פעמיים.

   HEADED=1  — חלון אמיתי עם GPU (headless רץ ב-SwiftShader, כ-3fps)
   WEBKIT=1  — מנוע ספארי (npx playwright install webkit)
   DPR=2     — צפיפות רטינה
   BASE=...  — ברירת מחדל http://localhost:3000 */
import { existsSync } from 'node:fs'
import { chromium, webkit } from 'playwright-core'

export const BASE = process.env.BASE || 'http://localhost:3000'
export const SHOTS = process.env.SHOTS || '/tmp'
const CHROME = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((p) => existsSync(p))

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const J = (x) => JSON.stringify(x)

export async function launch() {
  const headed = !!process.env.HEADED
  if (process.env.WEBKIT) return webkit.launch({ headless: !headed })
  /* OFFSCREEN=1: חלון אמיתי עם GPU, אבל ממוקם הרחק מחוץ למסך — מדידת
     חלקות דורשת GPU אמיתי (headless רץ ב-SwiftShader, כ-3fps), ואין
     סיבה שהחלון יקפוץ על המסך של מי שעובד. */
  const off = !!process.env.OFFSCREEN
  return chromium.launch({
    executablePath: CHROME,
    headless: !headed && !off,
    args: (headed || off)
      ? [off ? '--window-position=-4000,-4000' : '--window-position=0,0']
      : ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  })
}

export async function newPage(browser, { log = [], width = 1280, height = 800 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: process.env.DPR ? +process.env.DPR : 1 })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[console.${m.type()}] ${m.text()}`) })
  page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`))
  return { page, ctx }
}

export async function shot(page, name) {
  const p = `${SHOTS}/${name}.png`
  await page.screenshot({ path: p })
  return p
}

/** לוחץ „התחילו/המשיכו" אם יש, ומחכה לסצנה ולהיעלמות לוח ההגעה */
export async function waitReady(page) {
  const start = page.getByRole('button', { name: /התחילו|המשיכו/ })
  for (let t = 0; t < 50; t++) {
    if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    if (await start.isVisible().catch(() => false)) await start.click({ timeout: 2000 }).catch(() => {})
    await sleep(1000)
  }
  for (let t = 0; t < 25; t++) {
    if (await page.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })) break
    await sleep(600)
  }
}

/** מצב המשחק כפי שהלומד רואה אותו */
export async function probe(page) {
  return page.evaluate(() => {
    const l = window.__ch1Live
    const txt = (s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() || null
    return {
      player: l ? [+l.player.x.toFixed(2), +l.player.z.toFixed(2)] : null,
      dialogue: txt('.hud-dialogue'),
      task: !!document.querySelector('.ch1-task'),
      find: !!document.querySelector('.ch1-find-card'),
      objective: txt('.hud-objective'),
      next: window.__ch1Where?.next ?? null,
      seen: window.__ch1Where?.seen ?? [],
    }
  })
}

export async function teleport(page, x, z) {
  await page.evaluate(([x, z]) => { window.__ch1Live.player.set(x, 0, z) }, [x, z])
}

/** סוגר את החלון הפתוח: כפתור הסיום אם יש, אחרת לחיצה על החלון */
export async function closeDialogue(page) {
  return page.evaluate(() => {
    const d = document.querySelector('.hud-dialogue')
    if (!d) return false
    const b = [...d.querySelectorAll('button')].find((b) => /סיום|לעבודה|מספיק|המשך|הבנתי|רָאוִי/.test(b.textContent))
    if (b) b.click()
    else d.click()
    return true
  })
}

/** סוגר שיחות עד שקט של שלוש שניות */
export async function drainDialogues(page) {
  let quiet = 0
  let closed = 0
  while (quiet < 3) {
    let n = 0
    for (let i = 0; i < 12; i++) {
      if (!(await closeDialogue(page))) break
      n++
      await sleep(400)
    }
    closed += n
    quiet = n ? 0 : quiet + 1
    await sleep(1000)
  }
  return closed
}
