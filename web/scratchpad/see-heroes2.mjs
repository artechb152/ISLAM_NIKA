import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
async function shoot(r, x, z, file) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(r, 'EXC:', e.message.slice(0, 100)))
  await page.addInitScript(([rr]) => {
    localStorage.clear()
    localStorage.setItem('ch1:intro:v1', '1')
    localStorage.setItem(`ch1:arrived:${rr}:v1`, '1')
    localStorage.setItem('ch1:muted', '1')
  }, [r])
  await page.goto(`http://localhost:3000/chapter1?region=${r}`, { waitUntil: 'domcontentloaded' })
  for (let t = 0; t < 50; t++) {
    if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
    await page.waitForTimeout(1500)
  }
  await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 }).catch(() => {})
  await page.waitForTimeout(2000)
  await page.evaluate(([xx, zz]) => window.__ch1Live.player.set(xx, 0, zz), [x, z])
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `scratchpad/${file}` })
  console.log('shot', file)
  await ctx.close()
}
await shoot('yemen-heights', -11, 12, 'hero-terraces.png')
await shoot('border-post', -1.8, -13, 'hero-gate.png')
await shoot('monastery', -4.2, 3.2, 'hero-monastery.png')
await shoot('mecca', 9, -3.2, 'hero-sanctuary.png')
await browser.close()
