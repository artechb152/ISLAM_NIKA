import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })

async function boot(found) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('EXC:', e.message.slice(0, 120)))
  await page.addInitScript(([f]) => {
    localStorage.clear()
    localStorage.setItem('ch1:intro:v1', '1')
    localStorage.setItem('ch1:arrived:border-post:v1', '1')
    localStorage.setItem('ch1:muted', '1')
    localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen: ['opening', 'rawi-intro'], entries: [1], region: 'border-post', found: f, solved: [] }))
  }, [found])
  await page.goto('http://localhost:3000/chapter1?region=border-post', { waitUntil: 'domcontentloaded' })
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
  await page.evaluate(() => window.__ch1Live.player.set(0.4, 0, -1.6))
  await page.waitForTimeout(2500)
  return { page, ctx }
}

// א. בלי ראיות: אין חפצים ליד המאזניים
{
  const { page, ctx } = await boot([])
  const t = await page.evaluate(() => window.__ch1Task)
  console.log('A) props before finds:', JSON.stringify(t?.props?.map((p) => p.id) ?? null))
  await page.screenshot({ path: 'scratchpad/hand-0-empty.png' })
  await ctx.close()
}
// ב. עם המטבע והחותם: שניהם שוכבים ליד המאזניים; מוסרים את המטבע
{
  const { page, ctx } = await boot(['find-drachm', 'find-seal-byz'])
  const t = await page.evaluate(() => window.__ch1Task)
  console.log('B) props after finds:', JSON.stringify(t?.props ?? null))
  await page.screenshot({ path: 'scratchpad/hand-1-both.png' })
  const coin = t.props.find((p) => p.id === 'show-drachm')
  const tgt = t.target
  await page.mouse.move(coin.x, coin.y); await page.waitForTimeout(250)
  await page.mouse.down()
  for (let k = 1; k <= 14; k++) { await page.mouse.move(coin.x + (tgt.x - coin.x) * k / 14, coin.y + (tgt.y - coin.y) * k / 14); await page.waitForTimeout(40) }
  await page.screenshot({ path: 'scratchpad/hand-2-drag.png' })
  await page.mouse.up()
  await page.waitForTimeout(1400)
  await page.screenshot({ path: 'scratchpad/hand-3-given.png' })
  const st = await page.evaluate(() => ({
    note: document.querySelector('.ch1-task')?.textContent?.includes('קטסיפון') ?? false,
    solved: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').solved,
  }))
  console.log('B) after handover:', JSON.stringify(st))
  await ctx.close()
}
await browser.close()
