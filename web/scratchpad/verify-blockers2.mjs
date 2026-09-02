import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: false })

async function freshRegion(region, extraSeen = [], entries = []) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 90)))
  await page.addInitScript(([r, seen, ent]) => {
    localStorage.clear()
    localStorage.setItem('ch1:intro:v1', '1')
    localStorage.setItem(`ch1:arrived:${r}:v1`, '1')
    if (seen.length) localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen, entries: ent, region: r, found: [], solved: [] }))
  }, [region, extraSeen, entries])
  await page.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'domcontentloaded' })
  for (let t = 0; t < 45; t++) {
    if (await page.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    for (const b of await page.locator('button').all()) { const tx = await b.innerText().catch(() => ''); if (tx.includes('התחילו') || tx.includes('המשיכו')) { await b.click().catch(() => {}); break } }
    await page.waitForTimeout(1200)
  }
  await page.waitForFunction(() => window.__ch1Live, null, { timeout: 20000 })
  await page.waitForFunction(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }, null, { timeout: 40000 })
  return { page, ctx, errors }
}
async function clearDialogues(page, giveAppearMs = 4000) {
  await page.waitForSelector('.hud-dialogue', { timeout: giveAppearMs }).catch(() => {})
  for (let i = 0; i < 40; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
    await page.keyboard.press('Space')
    await page.waitForTimeout(280)
  }
  await page.waitForTimeout(600)
  return !(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))
}

// ── תרחיש 1: רמות תימן — תחנה בלי קריסה, R חי, Escape מדלג וסוגר ──
{
  const { page, ctx, errors } = await freshRegion('yemen-heights')
  const cleared = await clearDialogues(page)
  await page.evaluate(() => window.__ch1Live.player.set(-7.4, 0, 9.5))
  await page.waitForTimeout(2500)
  console.log('1) opening cleared:', cleared, '· station errors:', errors.length)
  await page.keyboard.press('KeyR')
  await page.waitForTimeout(900)
  const rLine = await page.evaluate(() => document.querySelector('.hud-dialogue .is-full')?.textContent?.slice(0, 35) ?? null)
  console.log('2) R fallback line:', JSON.stringify(rLine))
  await page.keyboard.press('Escape'); await page.waitForTimeout(350)
  await page.keyboard.press('Escape'); await page.waitForTimeout(450)
  console.log('3) double-escape closed:', !(await page.evaluate(() => !!document.querySelector('.hud-dialogue'))))
  await ctx.close()
}
// ── תרחיש 2: המחנה — פתרון, beat פעם אחת, בלי לולאה גם אחרי reload ──
{
  const { page, ctx, errors } = await freshRegion('night-camp', ['rawi-intro'], [2])
  await clearDialogues(page)
  await page.evaluate(() => window.__ch1Live.player.set(1.6, 0, -4.0))
  await page.waitForTimeout(900)
  await page.keyboard.press('KeyE'); await page.waitForTimeout(900)
  for (const b of await page.$$('.ch1-task-card button')) { const t = await b.innerText().catch(() => ''); if (t.includes('צפונה')) { await b.click(); break } }
  await page.waitForTimeout(700)
  for (const b of await page.$$('.ch1-task-card button')) { const t = await b.innerText().catch(() => ''); if (t.includes('הלאה')) { await b.click(); break } }
  await page.waitForTimeout(1700)
  const beatShown = await page.evaluate(() => document.querySelector('.hud-dialogue .is-full')?.textContent?.slice(0, 25) ?? null)
  const closedOk = await clearDialogues(page, 1500)
  await page.waitForTimeout(3000)
  const loop1 = await page.evaluate(() => !!document.querySelector('.hud-dialogue'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  for (const b of await page.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break } }
  await page.waitForFunction(() => window.__ch1Live, null, { timeout: 90000 }).catch(() => console.log('   (reload load slow)'))
  await page.waitForTimeout(4000)
  const loop2 = await page.evaluate(() => !!document.querySelector('.hud-dialogue'))
  console.log('4) beat:', JSON.stringify(beatShown), '· closed:', closedOk, '· loops:', loop1, '· after reload:', loop2, '· errors:', errors.length)
  await ctx.close()
}
await browser.close()
