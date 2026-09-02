// שחזור התקיעה: פאנל תכנון-המסלול ב-942px — הכפתורים חייבים להישאר נגישים
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1902, height: 942 } })).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:night-camp:v1', '1')
})
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' })
/* כפתור הפתיחה מגיע מאוחר — מנסים עד שהוא באמת נלחץ */
let entered = false
for (let i = 0; i < 30 && !entered; i++) {
  await page.waitForTimeout(1000)
  for (const b of await page.$$('button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); entered = true; break }
  }
}
console.log('entered:', entered)
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 90000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 90000 }).catch(() => console.log('arrive overlay never marked gone'))
await page.waitForTimeout(4000)
for (let i = 0; i < 14; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(350)
}
await page.evaluate(() => window.__ch1Live.player.set(1.6, 0, -4.0))
await page.waitForTimeout(1500)
await page.screenshot({ path: 'scratchpad/m2-scene.png' })
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
  if (await page.$('.ch1-task-card')) break
}
await page.waitForSelector('.ch1-task-card', { timeout: 5000 })
await page.waitForTimeout(800)
const clickBy = async (txt) => {
  for (const b of await page.$$('.ch1-task-card button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes(txt)) { await b.click(); return true }
  }
  return false
}
const read = async () => page.evaluate(() => {
  const card = document.querySelector('.ch1-task-card')
  const overlay = document.querySelector('.ch1-task')
  const btns = [...document.querySelectorAll('.ch1-task-card button')].map((b) => {
    const r = b.getBoundingClientRect()
    return { t: b.innerText.trim().slice(0, 20), inView: r.top >= 0 && r.bottom <= innerHeight }
  })
  return {
    cardH: Math.round(card?.getBoundingClientRect().height ?? -1), viewH: innerHeight,
    pos: overlay ? getComputedStyle(overlay).position : null,
    overflowY: overlay ? getComputedStyle(overlay).overflowY : null,
    allBtnsInView: btns.every((b) => b.inView), btns,
  }
})
console.log('OPEN', JSON.stringify(await read()))
console.log('wrong:', await clickBy('מזרחה')); await page.waitForTimeout(1000)
console.log('AFTER-WRONG', JSON.stringify(await read()))
await page.screenshot({ path: 'scratchpad/m2-wrong.png' })
console.log('right:', await clickBy('צפונה')); await page.waitForTimeout(1800)
console.log('SOLVED', JSON.stringify(await page.evaluate(() => ({ done: !!document.querySelector('.ch1-task-done') }))))
await page.screenshot({ path: 'scratchpad/m2-solved.png' })
await browser.close()
