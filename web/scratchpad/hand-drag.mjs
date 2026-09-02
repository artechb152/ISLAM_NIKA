import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
page.on('pageerror', (e) => console.log('EXC:', e.message.slice(0, 150)))
await page.addInitScript(() => {
  localStorage.clear()
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:border-post:v1', '1')
  localStorage.setItem('ch1:muted', '1')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen: ['opening', 'rawi-intro'], entries: [1], region: 'border-post', found: ['find-drachm', 'find-seal-byz'], solved: [] }))
})
await page.goto('http://localhost:3000/chapter1?region=border-post', { waitUntil: 'domcontentloaded' })
for (let t = 0; t < 60; t++) {
  if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
  for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
  await page.waitForTimeout(1500)
}
if (!(await page.evaluate(() => !!window.__ch1Live).catch(() => false))) { console.log('LOAD FAIL'); await browser.close(); process.exit(1) }
await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 }).catch(() => console.log('(arrive slow)'))
for (let i = 0; i < 30; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(250)
}
let t = null
for (let r = 0; r < 8 && !t; r++) {
  await page.evaluate(() => window.__ch1Live?.player.set(0.4, 0, -1.6)).catch(() => {})
  await page.waitForTimeout(3000)
  t = await page.evaluate(() => window.__ch1Task).catch(() => null)
  if (!t) console.log('  hooks not up yet (' + r + ')')
}
if (!t) { await page.screenshot({ path: 'scratchpad/nohooks.png' }); console.log('NO HOOKS', JSON.stringify(await page.evaluate(() => ({ at: window.__ch1Live.atTask, px: window.__ch1Live.player.x, pz: window.__ch1Live.player.z, dlg: !!document.querySelector('.hud-dialogue'), arrive: document.querySelector('.ch1-arrive')?.className ?? null })))); await browser.close(); process.exit(1) }
console.log('target:', JSON.stringify(t.target))
const coin = t.props.find((p) => p.id === 'show-drachm')
await page.mouse.move(coin.x, coin.y)
await page.waitForTimeout(300)
await page.mouse.down()
await page.mouse.move(coin.x + 5, coin.y + 5)
await page.waitForTimeout(250)
console.log('dragging after down:', await page.evaluate(() => window.__ch1Task.dragging))
for (let k = 1; k <= 14; k++) { await page.mouse.move(coin.x + (t.target.x - coin.x) * k / 14, coin.y + (t.target.y - coin.y) * k / 14); await page.waitForTimeout(50) }
await page.screenshot({ path: 'scratchpad/hand2-drag.png' })
await page.mouse.up()
await page.waitForTimeout(1300)
console.log('final:', JSON.stringify(await page.evaluate(() => ({
  panel: document.querySelector('.ch1-task')?.textContent?.slice(0, 80) ?? null,
  solved: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').solved,
}))))
await page.screenshot({ path: 'scratchpad/hand2-final.png' })
await browser.close()
