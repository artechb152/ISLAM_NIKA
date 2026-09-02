import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:border-post:v1', '1')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({
    seen: ['envoy-empires', 'envoy-sasanian'], entries: [3, 4], region: 'border-post', found: [], solved: [],
  }))
})
await page.goto('http://localhost:3000/chapter1?region=border-post', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break }
}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2500)
const clearPanels = async () => {
  for (let i = 0; i < 10; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue, .ch1-find-card')))) break
    await page.keyboard.press('Space'); await page.waitForTimeout(300)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  }
}
await clearPanels()
const pickup = async (x, z) => {
  await page.evaluate(([px, pz]) => window.__ch1Live.player.set(px, 0, pz), [x, z])
  await page.waitForTimeout(700)
  await page.keyboard.press('KeyF')
  await page.waitForTimeout(800)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}
await pickup(-2.97, -3.2)
await pickup(1.66, 1.15)
await clearPanels()
await page.evaluate(() => window.__ch1Live.player.set(0.4, 0, -1.6))
await page.waitForTimeout(700)
await page.keyboard.press('KeyE')
await page.waitForTimeout(1000)
const clickBy = async (txt) => {
  for (const b of await page.$$('.ch1-task-card button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes(txt)) { await b.click(); return }
  }
}
await clickBy('חותם'); await page.waitForTimeout(800)
await page.screenshot({ path: 'scratchpad/present-seal.png' })
await clickBy('מטבע'); await page.waitForTimeout(800)
await page.screenshot({ path: 'scratchpad/present-solved.png' })
const state = await page.evaluate(() => ({
  solvedText: document.querySelector('.ch1-task-done')?.textContent ?? null,
  note: document.querySelector('.ch1-task-note')?.textContent?.slice(0, 50) ?? null,
}))
console.log(JSON.stringify(state))
await browser.close()
