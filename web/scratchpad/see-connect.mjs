import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:yathrib:v1', '1')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({
    seen: ['jewish-arrival', 'jewish-south', 'jewish-neighbors', 'jewish-difference', 'jewish-messiah'],
    entries: [9, 10, 11, 12, 13], region: 'yathrib', found: [], solved: [],
  }))
})
await page.goto('http://localhost:3000/chapter1?region=yathrib', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break }
}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2500)
for (let i = 0; i < 10; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(300)
}
await page.evaluate(() => window.__ch1Live.player.set(1.4, 0, 4.6))
await page.waitForTimeout(700)
await page.keyboard.press('KeyE')
await page.waitForTimeout(1000)
// שני פריטים: אחד נכון אחד שגוי
const item = async (idx) => { await page.evaluate((i) => document.querySelectorAll('.ch1-sort-item:not([disabled])')[i]?.click(), idx); await page.waitForTimeout(300) }
const bin = async (idx) => { await page.evaluate((i) => document.querySelectorAll('.ch1-sort-bin')[i]?.click(), idx); await page.waitForTimeout(500) }
await item(0); await bin(0)
await page.screenshot({ path: 'scratchpad/connect-1.png' })
// המשיח לצד הלא-נכון — לראות את התיקון המלמד
for (const b of await page.$$('.ch1-sort-item:not([disabled])')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('משיח')) { await b.click(); break }
}
await page.waitForTimeout(300)
await bin(1)
await page.screenshot({ path: 'scratchpad/connect-wrong.png' })
await browser.close()
