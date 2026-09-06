import { open } from './lib-probe.mjs'
for (const r of ['border-post','narrow-pass','loading-road','yathrib','monastery','mecca']) {
  const { browser, page } = await open(r, { w: 800, h: 500 })
  await page.waitForTimeout(3200)
  const names = await page.evaluate(() => (window.__ch1Audit?.sizes ?? []).map(s=>s.name).filter(n=>n.startsWith('cast:')))
  const torch0 = await page.evaluate(() => (window.__ch1Audit?.sizes ?? []).filter(s=>/@0\.0,0\.0/.test(s.name)).map(s=>s.name))
  console.log(r.padEnd(14), 'cast:', JSON.stringify(names), ' at-origin:', JSON.stringify(torch0))
  await browser.close()
}
