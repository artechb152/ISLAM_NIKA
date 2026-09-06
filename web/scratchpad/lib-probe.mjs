/* בסיס משותף לכל הבדיקות — headless, בלי לפתוח חלון למשתמשת */
import { chromium } from 'playwright-core'
export async function open(region, { w = 1280, h = 800 } = {}) {
  const browser = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)))
  await page.addInitScript((r) => {
    localStorage.setItem('ch1:intro:v1', '1')
    if (r) localStorage.setItem(`ch1:arrived:${r}:v1`, '1')
  }, region)
  await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'domcontentloaded' })
  let entered = false
  for (let i = 0; i < 40 && !entered; i++) {
    await page.waitForTimeout(1000)
    for (const b of await page.$$('button')) {
      const t = await b.innerText().catch(() => '')
      if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); entered = true; break }
    }
  }
  await page.waitForFunction(() => window.__ch1Live, null, { timeout: 120000 })
  await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 120000 }).catch(() => {})
  await page.waitForTimeout(2500)
  for (let i = 0; i < 16; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
    await page.keyboard.press('Space'); await page.waitForTimeout(300)
  }
  return { browser, page, errors, entered }
}
