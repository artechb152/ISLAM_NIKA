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
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2500)
for (let i = 0; i < 8; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(300)
}
// לזנק לתוך שער קדימה בלי ליבה
const before = await page.evaluate(() => window.location.search)
await page.evaluate(() => window.__ch1Live.player.set(0, 0, -20))
await page.waitForTimeout(1800)
const held = await page.evaluate(() => ({
  url: window.location.search,
  holdLine: document.querySelector('.hud-dialogue .is-full')?.textContent?.slice(0, 80) ?? null,
  riseAt: window.__ch1Live.riseAt,
}))
console.log('before:', before)
console.log(JSON.stringify(held, null, 1))
await page.screenshot({ path: 'scratchpad/coregate-held.png' })
await browser.close()
