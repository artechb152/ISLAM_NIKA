import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
page.on('pageerror', (e) => console.log('EXC:', e.message.slice(0, 120)))
await page.addInitScript(() => {
  localStorage.clear()
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:night-camp:v1', '1')
  localStorage.setItem('ch1:muted', '1')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen: ['opening', 'rawi-intro'], entries: [1], region: 'night-camp', found: [], solved: [] }))
})
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' })
for (let t = 0; t < 50; t++) {
  if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
  for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
  await page.waitForTimeout(1400)
}
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 }).catch(() => {})
for (let i = 0; i < 30; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(250)
}
// אל התחנה
await page.evaluate(() => window.__ch1Live.player.set(1.6, 0, -3.4))
await page.waitForTimeout(2500)
await page.screenshot({ path: 'scratchpad/plan-1-map.png' })
const task = await page.evaluate(() => window.__ch1Task)
console.log('task hooks:', JSON.stringify(task))
if (!task) { console.log('NO __ch1Task'); await browser.close(); process.exit(1) }
// גרירה אל דרך שגויה: מזרחה (spot dx 2.0) — מסך: מחשבים מיעד צפון? אין לנו east ב-target.
// נגרור מהאסימון אל ימין-מטה יחסית לתחנה בעזרת הקרנה: ניקח את מיקום האסימון ונזוז 250px שמאלה? 
// פשוט יותר: יעד ה-target שבחלון הוא הדרך הנכונה (צפון). קודם נבדוק סירוב: גוררים לכיוון ההפוך ממנו.
const p0 = task.props[0]
const tno = task.target
const wrong = { x: p0.x - (tno.x - p0.x) * 0.9, y: p0.y - (tno.y - p0.y) * 0.9 }
await page.mouse.move(p0.x, p0.y); await page.waitForTimeout(300)
await page.screenshot({ path: 'scratchpad/plan-2-hover.png' })
await page.mouse.down()
for (let k = 1; k <= 12; k++) { await page.mouse.move(p0.x + (wrong.x - p0.x) * k / 12, p0.y + (wrong.y - p0.y) * k / 12); await page.waitForTimeout(40) }
await page.screenshot({ path: 'scratchpad/plan-3-drag-wrong.png' })
await page.mouse.up()
await page.waitForTimeout(1200)
await page.screenshot({ path: 'scratchpad/plan-4-refused.png' })
const wrongNote = await page.evaluate(() => document.querySelector('.ch1-task')?.textContent?.slice(0, 120) ?? null)
console.log('wrong note:', JSON.stringify(wrongNote))
await page.keyboard.press('Escape'); await page.waitForTimeout(600)
// עכשיו אל הצפון — היעד האמיתי
const t2 = await page.evaluate(() => window.__ch1Task)
const q0 = t2.props[0], qt = t2.target
await page.mouse.move(q0.x, q0.y); await page.mouse.down()
for (let k = 1; k <= 14; k++) { await page.mouse.move(q0.x + (qt.x - q0.x) * k / 14, q0.y + (qt.y - q0.y) * k / 14); await page.waitForTimeout(40) }
await page.screenshot({ path: 'scratchpad/plan-5-drag-north.png' })
await page.mouse.up()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'scratchpad/plan-6-solved.png' })
const st = await page.evaluate(() => ({
  solvedPanel: document.querySelector('.ch1-task')?.textContent?.slice(0, 100) ?? null,
  dlg: !!document.querySelector('.hud-dialogue'),
}))
console.log('after north:', JSON.stringify(st))
await browser.close()
