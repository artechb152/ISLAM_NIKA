/* Visual QA: the envoy interrogation, the hubal question, the toll note. */
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const CAST = [...readFileSync('src/lib/chapter1/placements.ts', 'utf8')
  .matchAll(/who:\s*'([^']+)',\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)].map((m) => ({ who: m[1], x: +m[2], z: +m[3] }))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
async function boot(region) {
  const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
  await pg.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
  await pg.reload({ waitUntil: 'networkidle' })
  await wait(1500)
  for (const b of await pg.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו')) { await b.click(); break } }
  for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
  for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
  await wait(2500)
  for (let i = 0; i < 24; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
  return pg
}
// 1. envoy interrogation opening line
{
  const pg = await boot('border-post')
  const envoy = CAST.find((c) => c.who === 'envoy')
  await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 1.6), envoy)
  await wait(1800)
  await pg.keyboard.press('KeyE')
  await wait(2600)
  await pg.screenshot({ path: 'scratchpad/tour/qa-envoy.png' })
  await pg.context().close()
}
await browser.close(); const browser2 = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }); Object.assign(globalThis, {}) // 2. merchant-hubal: reach the choices (3rd merchant encounter)
{
  const pg = await boot('mecca')
  const merchant = CAST.find((c) => c.who === 'merchant')
  await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 1.6), merchant)
  await wait(1800)
  for (let enc = 0; enc < 3; enc++) {
    await pg.keyboard.press('KeyE')
    await wait(1200)
    // advance through lines; stop when choices visible
    for (let i = 0; i < 14; i++) {
      const choices = await pg.evaluate(() => !!document.querySelector('.hud-choices'))
      if (choices) break
      const open = await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))
      if (!open) break
      await pg.keyboard.press('Space')
      await wait(500)
    }
    const choices = await pg.evaluate(() => !!document.querySelector('.hud-choices'))
    if (choices && enc === 2) break
    // close via the leave button if present, else space
    const leave = await pg.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /נמשיך|המשך/.test(x.innerText))
      if (b) { b.click(); return true }
      return false
    })
    if (!leave) await pg.keyboard.press('Space')
    await wait(700)
  }
  await wait(500)
  await pg.screenshot({ path: 'scratchpad/tour/qa-hubal.png' })
  // pick the question if offered
  const q = await pg.$('.hud-choices .hud-card-btn')
  if (q) { await q.click(); await wait(2200); await pg.screenshot({ path: 'scratchpad/tour/qa-hubal-answer.png' }) }
  await pg.context().close()
}
await browser.close()
console.log('qa shots done')
