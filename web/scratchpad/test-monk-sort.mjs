import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] })

async function boot(found) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('EXC:', e.message.slice(0, 130)))
  await page.addInitScript(([f]) => {
    localStorage.clear()
    localStorage.setItem('ch1:intro:v1', '1')
    localStorage.setItem('ch1:arrived:monastery:v1', '1')
    localStorage.setItem('ch1:muted', '1')
    localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen: ['opening', 'rawi-hello'], entries: [1], region: 'monastery', found: f, solved: [], chosen: [] }))
  }, [found])
  await page.goto('http://localhost:3000/chapter1?region=monastery', { waitUntil: 'domcontentloaded' })
  for (let t = 0; t < 55; t++) {
    if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
    await page.waitForTimeout(1400)
  }
  await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 }).catch(() => {})
  for (let i = 0; i < 30; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
    await page.keyboard.press('Space'); await page.waitForTimeout(240)
  }
  await page.evaluate(() => window.__ch1Live.player.set(-2.6, 0, 5.6))
  await page.waitForTimeout(2600)
  return { page, ctx }
}
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y); await page.waitForTimeout(250)
  await page.mouse.down(); await page.mouse.move(from.x + 4, from.y + 4); await page.waitForTimeout(200)
  for (let k = 1; k <= 14; k++) { await page.mouse.move(from.x + (to.x - from.x) * k / 14, from.y + (to.y - from.y) * k / 14); await page.waitForTimeout(45) }
  await page.mouse.up(); await page.waitForTimeout(1200)
}

// א. נעול — בלי שלוש התצפיות
{
  const { page, ctx } = await boot([])
  const t = await page.evaluate(() => window.__ch1Task ?? null)
  console.log('A) locked: labels:', await page.locator('.ch1-prop-label').count(), '· bins published:', t?.bins?.length ?? 0)
  await page.screenshot({ path: 'scratchpad/monk-locked.png' })
  await ctx.close()
}
// ב. פתוח — מיון: טעות ואז נכון
{
  const { page, ctx } = await boot(['find-monk-bread', 'find-monk-hymn', 'find-monk-routine'])
  const t = await page.evaluate(() => window.__ch1Task)
  console.log('B) props:', t.props.map((p) => p.id).join(','), '· bins:', JSON.stringify(t.bins?.map((b) => b.id)))
  await page.screenshot({ path: 'scratchpad/monk-open.png' })
  const ritual = t.props.find((p) => p.id === 'ritual')
  const stayed = t.bins.find((b) => b.id === 'stayed')
  const crossed = t.bins.find((b) => b.id === 'crossed')
  await drag(page, ritual, stayed) // שגוי — פולחן דווקא חצה
  const wrongNote = await page.evaluate(() => document.querySelector('.ch1-task')?.textContent?.includes('דווקא אלה עברו') ?? false)
  console.log('B) wrong-side note shown:', wrongNote)
  await page.screenshot({ path: 'scratchpad/monk-wrong.png' })
  await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  const t2 = await page.evaluate(() => window.__ch1Task)
  const r2 = t2.props.find((p) => p.id === 'ritual')
  await drag(page, r2, crossed) // נכון
  const st = await page.evaluate(() => ({
    placed: window.__ch1Task.props.find((p) => p.id === 'ritual')?.placed,
    chosen: JSON.parse(localStorage.getItem('ch1:notebook:v1')).chosen,
  }))
  console.log('B) ritual placed:', st.placed, '· chosen:', JSON.stringify(st.chosen))
  await page.screenshot({ path: 'scratchpad/monk-placed.png' })
  await ctx.close()
}
await browser.close()
