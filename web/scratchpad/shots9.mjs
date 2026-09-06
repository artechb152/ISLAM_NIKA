import { open } from './lib-probe.mjs'
for (const r of process.argv.slice(2)) {
  try {
    const { browser, page, errors } = await open(r, { w: 1400, h: 800 })
    await page.waitForTimeout(2500)
    const goal = await page.evaluate(() => document.querySelector('.hud-goal')?.innerText.replace(/\s+/g,' ').trim())
    await page.screenshot({ path: `scratchpad/round2/${r}.png` })
    console.log(r.padEnd(15), '|', goal, '| errors:', errors.length)
    await browser.close()
  } catch (e) { console.log(r, 'FAILED', String(e).slice(0,90)) }
}
