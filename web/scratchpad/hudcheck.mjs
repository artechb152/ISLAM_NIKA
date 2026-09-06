import { open } from './lib-probe.mjs'
for (const r of ['yemen-heights','narrow-pass','mecca']) {
  const { browser, page, errors } = await open(r, { w: 1400, h: 800 })
  await page.waitForTimeout(1500)
  console.log(r, JSON.stringify(await page.evaluate(() => ({
    goal: document.querySelector('.hud-goal')?.innerText.replace(/\s+/g,' ').trim(),
    bar: document.querySelector('.hud-progress i')?.style.width,
  }))), 'errors:', errors.length)
  await browser.close()
}
