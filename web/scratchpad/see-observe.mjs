import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:monastery:v1', '1')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({
    seen: ['monk-christianity', 'monk-influence', 'monk-practices', 'monk-quran'],
    entries: [14, 15, 16, 17], region: 'monastery', found: [], solved: [],
  }))
})
await page.goto('http://localhost:3000/chapter1?region=monastery', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break }
}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2500)
const clearPanels = async () => {
  for (let i = 0; i < 8; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue, .ch1-find-card')))) break
    await page.keyboard.press('Space'); await page.waitForTimeout(250)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  }
}
await clearPanels()
// אל המזבח לפני תצפיות — מסך נעול
await page.evaluate(() => window.__ch1Live.player.set(-2.6, 0, 5.6))
await page.waitForTimeout(700)
await page.keyboard.press('KeyE')
await page.waitForTimeout(900)
await page.screenshot({ path: 'scratchpad/observe-locked.png' })
await page.keyboard.press('Escape'); await page.waitForTimeout(400)
// שלוש התצפיות
for (const [x, z] of [[1.2, 20.2], [5.2, -4.4], [-7.2, -5.6]]) {
  await page.evaluate(([px, pz]) => window.__ch1Live.player.set(px, 0, pz), [x, z])
  await page.waitForTimeout(700)
  await page.keyboard.press('KeyF')
  await page.waitForTimeout(900)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}
await clearPanels()
await page.evaluate(() => window.__ch1Live.player.set(-2.6, 0, 5.6))
await page.waitForTimeout(700)
await page.keyboard.press('KeyE')
await page.waitForTimeout(900)
await page.screenshot({ path: 'scratchpad/observe-open.png' })
const st = await page.evaluate(() => ({
  tray: document.querySelectorAll('.ch1-sort-item').length,
  checklist: !!document.querySelector('.ch1-observe-list'),
  foundCount: JSON.parse(localStorage.getItem('ch1:notebook:v1')).found.length,
}))
console.log(JSON.stringify(st))
await browser.close()
