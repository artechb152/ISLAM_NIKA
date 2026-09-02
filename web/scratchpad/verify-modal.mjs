// שחזור התקיעה: פאנל תכנון-המסלול ב-942px גובה — הכפתורים חייבים להיות נגישים
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 1902, height: 942 } })).newPage()
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:night-camp:v1', '1')
})
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break }
}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2000)
for (let i = 0; i < 10; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(300)
}
await page.evaluate(() => window.__ch1Live.player.set(1.6, 0, -4.0))
await page.waitForTimeout(800)
await page.keyboard.press('KeyE')
await page.waitForTimeout(1000)
// טעות כדי שההערה תוסיף גובה — התרחיש שדחף את הפאנל מעבר לקו
for (const b of await page.$$('.ch1-task-card button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('מזרחה')) { await b.click(); break }
}
await page.waitForTimeout(700)
const st = await page.evaluate(() => {
  const card = document.querySelector('.ch1-task-card')
  const overlay = document.querySelector('.ch1-task')
  const later = [...document.querySelectorAll('.ch1-task-card button')].find((b) => b.innerText.includes('אחר כך'))
  const r = later?.getBoundingClientRect()
  const errBadge = !!document.querySelector('[data-nextjs-toast], nextjs-portal')
  return {
    cardH: card?.scrollHeight, viewH: innerHeight,
    overlayScrollable: overlay ? overlay.scrollHeight <= overlay.clientHeight + 4 || getComputedStyle(overlay).overflowY === 'auto' : null,
    closeBtnVisible: r ? r.bottom <= innerHeight && r.top >= 0 : false,
    devErrorBadge: errBadge,
  }
})
console.log(JSON.stringify(st))
// לפתור נכון — לוודא שאין עוד "1 Issue"
for (const b of await page.$$('.ch1-task-card button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('צפונה')) { await b.click(); break }
}
await page.waitForTimeout(1200)
const after = await page.evaluate(() => ({
  solved: !!document.querySelector('.ch1-task-done'),
  devErrorBadge: !!document.querySelector('[data-nextjs-toast], nextjs-portal .nextjs-toast-errors-parent, #nextjs-portal-root [role=alert]'),
  portals: [...document.querySelectorAll('nextjs-portal')].length,
}))
console.log(JSON.stringify(after))
await page.screenshot({ path: 'scratchpad/modal-fixed.png' })
await browser.close()
