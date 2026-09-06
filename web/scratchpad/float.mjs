import { open } from './lib-probe.mjs'
for (const r of process.argv.slice(2)) {
  const { browser, page } = await open(r, { w: 800, h: 500 })
  await page.waitForTimeout(3500)
  const a = await page.evaluate(() => window.__ch1Audit)
  console.log(r, JSON.stringify(a.floating))
  await browser.close()
}
