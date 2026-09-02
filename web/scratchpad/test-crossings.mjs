import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] })

async function cross(region, seenExtra, startX, startZ, stepZ, wantTo) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  await page.addInitScript(([r, seen]) => {
    localStorage.clear()
    localStorage.setItem('ch1:intro:v1', '1')
    localStorage.setItem(`ch1:arrived:${r}:v1`, '1')
    localStorage.setItem('ch1:muted', '1')
    localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen, entries: [1], region: r, found: [], solved: [] }))
  }, [region, ['opening', 'rawi-hello', ...seenExtra]])
  await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'domcontentloaded' })
  for (let t = 0; t < 50; t++) {
    if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
    await page.waitForTimeout(1500)
  }
  await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 }).catch(() => {})
  for (let i = 0; i < 30; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
    await page.keyboard.press('Space'); await page.waitForTimeout(250)
  }
  await page.evaluate(([x, z]) => window.__ch1Live.player.set(x, 0, z), [startX, startZ])
  await page.waitForTimeout(900)
  let result = 'stuck'
  for (let s = 0; s < 60; s++) {
    const r = await page.evaluate(([dz]) => { const p = window.__ch1Live.player; p.set(p.x, 0, p.z + dz); return { z: p.z, dlg: !!document.querySelector('.hud-dialogue') } }, [stepZ]).catch(() => null)
    if (r === null) { result = 'navigated'; break }
    if (r.dlg) { result = 'dialogue at z=' + r.z.toFixed(1); break }
    await page.waitForTimeout(110)
  }
  await page.waitForTimeout(2500)
  const url = page.url()
  console.log(`${region} → ${wantTo}: ${result} · url now: ...${url.slice(-45)} · ${url.includes(wantTo) ? 'PASS ✓' : (result === 'stuck' ? 'FAIL ✗' : 'guarded/other')}`)
  await ctx.close()
}
// הקו ה"ישר" שבו נתקעה הסוכנת: x≈0.5
await cross('yathrib', ['rawi-hold-yathrib'], 0.5, -26, -0.36, 'monastery')
await cross('monastery', ['rawi-hold-monastery'], 0.5, -10, -0.36, 'mecca')
await browser.close()
