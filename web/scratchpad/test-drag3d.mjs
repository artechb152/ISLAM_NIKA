// בדיקת הגרירה המשודרגת בדרך ההעמסה: hover, גרירה אל הארגז, טבעות
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:loading-road:v1', '1')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({
    seen: ['rawi-seep'], entries: [8], region: 'loading-road', found: [], solved: [],
  }))
})
await page.goto('http://localhost:3000/chapter1?region=loading-road', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break }
}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 30000 })
await page.waitForTimeout(2200)
for (let i = 0; i < 8; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(300)
}
// אל התחנה כדי ש-atTask יידלק ו-__ch1Task יתפרסם
await page.evaluate(() => window.__ch1Live.player.set(3.9, 0, 1.8))
await page.waitForTimeout(1200)
const dbg = await page.evaluate(() => ({ atTask: window.__ch1Live.atTask, px: window.__ch1Live.player.x, pz: window.__ch1Live.player.z }))
console.log('state:', JSON.stringify(dbg))
await page.waitForTimeout(1500)
const info = await page.evaluate(() => window.__ch1Task ?? null)
console.log('task hooks:', JSON.stringify(info))
if (info && info.props.length) {
  const p0 = info.props[0]
  // hover
  await page.mouse.move(p0.x, p0.y)
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'scratchpad/committee-r0/drag3d-hover.png' })
  // גרירה אל היעד
  await page.mouse.down()
  const t = info.target
  for (let k = 1; k <= 6; k++) {
    await page.mouse.move(p0.x + ((t.x - p0.x) * k) / 6, p0.y + ((t.y - p0.y) * k) / 6)
    await page.waitForTimeout(120)
  }
  await page.screenshot({ path: 'scratchpad/committee-r0/drag3d-drag.png' })
  await page.mouse.up()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'scratchpad/committee-r0/drag3d-after.png' })
  const after = await page.evaluate(() => ({
    task: window.__ch1Task,
    panel: !!document.querySelector('.ch1-task'),
    note: document.querySelector('.ch1-task-note')?.textContent?.slice(0, 40) ?? null,
  }))
  console.log('after drop:', JSON.stringify(after))
}
await browser.close()
