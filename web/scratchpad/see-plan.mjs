import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
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
await page.waitForTimeout(3500)
for (let i = 0; i < 14; i++) {
  const open = await page.evaluate(() => !!document.querySelector('.hud-dialogue'))
  if (!open) break
  await page.keyboard.press('Space'); await page.waitForTimeout(350)
}
// אל התחנה
await page.evaluate(() => window.__ch1Live.player.set(1.6, 0, -4.0))
await page.waitForTimeout(900)
await page.keyboard.press('KeyE')
await page.waitForTimeout(1200)
await page.screenshot({ path: 'scratchpad/plan-panel.png' })
// טעות קודם — מזרחה
const clickBy = async (txt) => {
  for (const b of await page.$$('.ch1-task-card button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes(txt)) { await b.click(); return true }
  }
  return false
}
await clickBy('מזרחה'); await page.waitForTimeout(900)
await page.screenshot({ path: 'scratchpad/plan-wrong.png' })
await clickBy('צפונה'); await page.waitForTimeout(900)
await page.screenshot({ path: 'scratchpad/plan-solved.png' })
for (const b of await page.$$('.ch1-task-card button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('הלאה')) { await b.click(); break }
}
await page.waitForTimeout(2500)
const beat = await page.evaluate(() => document.querySelector('.hud-dialogue .is-full')?.textContent?.slice(0, 60) ?? null)
console.log('departure beat:', JSON.stringify(beat))
await page.screenshot({ path: 'scratchpad/plan-beat.png' })
await browser.close()
