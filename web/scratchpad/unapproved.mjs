import { open } from './lib-probe.mjs'
const R = process.argv.slice(2)
let total = 0
for (const r of R) {
  const { browser, page } = await open(r, { w: 800, h: 500 })
  await page.waitForFunction(() => window.__ch1Audit, null, { timeout: 90000 }).catch(() => {})
  /* הביקורת רצה שוב עד שהעולם מפסיק לגדול — מחכים שהיא תתייצב */
  await page.waitForTimeout(4000)
  let prev = -1
  for (let k = 0; k < 8; k++) {
    const n = await page.evaluate(() => window.__ch1Audit?.counted ?? 0)
    if (n === prev) break
    prev = n
    await page.waitForTimeout(2600)
  }
  const a = await page.evaluate(() => window.__ch1Audit)
  if (!a) { console.log(`${r.padEnd(15)} NO AUDIT`); await browser.close(); continue }
  total += a.unapproved.length
  console.log(`${r.padEnd(15)} contacts=${String(a.overlaps.length).padStart(3)}  UNAPPROVED=${a.unapproved.length}  offGround=${a.floating.length}`)
  for (const h of a.unapproved.slice(0, 8)) console.log(`    ${h.a} ↔ ${h.b}  ${h.depth}m ${Math.round(h.frac*100)}%`)
  await browser.close()
}
console.log('TOTAL UNAPPROVED:', total)
