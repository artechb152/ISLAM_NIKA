import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message.slice(0, 80)))
// ── 1: רמות תימן — התקרבות לתחנה בלי קריסה, R חי ──
await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('ch1:intro:v1', '1'); localStorage.setItem('ch1:arrived:yemen-heights:v1', '1') })
await page.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
for (const b of await page.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break } }
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2000)
for (let i = 0; i < 30; i++) { if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await page.keyboard.press('Space'); await page.waitForTimeout(260) }
await page.evaluate(() => window.__ch1Live.player.set(-7.4, 0, 9.5))
await page.waitForTimeout(2500)
console.log('1) at compare station — errors:', errors.length, JSON.stringify(errors.slice(0, 2)))
errors.length = 0
await page.keyboard.press('KeyR')
await page.waitForTimeout(900)
const rLine = await page.evaluate(() => document.querySelector('.hud-dialogue .is-full')?.textContent?.slice(0, 40) ?? null)
console.log('2) R in yemen →', JSON.stringify(rLine))
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
await page.keyboard.press('Escape'); await page.waitForTimeout(400)
console.log('3) double-escape closed:', !(await page.evaluate(() => !!document.querySelector('.hud-dialogue'))))
// ── 2: המחנה — פתרון והיעדר לולאה ──
await page.goto('http://localhost:3000/chapter1?region=night-camp', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)
for (const b of await page.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break } }
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2000)
for (let i = 0; i < 30; i++) { if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await page.keyboard.press('Space'); await page.waitForTimeout(260) }
await page.evaluate(() => window.__ch1Live.player.set(1.6, 0, -4.0))
await page.waitForTimeout(900)
await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
for (const b of await page.$$('.ch1-task-card button')) { const t = await b.innerText().catch(() => ''); if (t.includes('צפונה')) { await b.click(); break } }
await page.waitForTimeout(700)
for (const b of await page.$$('.ch1-task-card button')) { const t = await b.innerText().catch(() => ''); if (t.includes('הלאה')) { await b.click(); break } }
await page.waitForTimeout(1600)
// ה-beat נפתח — סוגרים ובודקים שלא חוזר
for (let i = 0; i < 6; i++) { if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await page.keyboard.press('Space'); await page.waitForTimeout(350) }
await page.waitForTimeout(2500)
const loop1 = await page.evaluate(() => !!document.querySelector('.hud-dialogue'))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
for (const b of await page.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break } }
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 }).catch(() => {})
await page.waitForTimeout(4000)
const loop2 = await page.evaluate(() => !!document.querySelector('.hud-dialogue'))
console.log('4) camp beat loops after close:', loop1, '· after reload:', loop2, '· errors:', errors.length)
await browser.close()
