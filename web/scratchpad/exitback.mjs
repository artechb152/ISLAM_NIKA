import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('night-camp')
console.log('start url:', await page.evaluate(() => location.search))
const trace = []
for (const z of [10, 13, 13.4, 14, 15]) {
  await page.evaluate((zz) => window.__ch1Live.player.set(0, 0, zz), z)
  await page.waitForTimeout(600)
  const banner = await page.evaluate(() => document.body.innerHTML.includes('רמות תימן') && !!document.querySelector('[class*="travel"],[class*="leave"],[class*="rise"]'))
  trace.push({ z, banner })
  const moved = await page.waitForFunction(() => location.search.includes('from='), null, { timeout: 4000 }).then(() => true).catch(() => false)
  if (moved) { trace.push({ z, TRAVELLED: await page.evaluate(() => location.search) }); break }
}
console.log(JSON.stringify(trace))
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
