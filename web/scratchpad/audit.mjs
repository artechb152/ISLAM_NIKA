import { open } from './lib-probe.mjs'
import { writeFileSync } from 'node:fs'
const REGIONS = ['yemen-heights','night-camp','border-post','narrow-pass','loading-road','yathrib','monastery','mecca','exit']
const all = []
for (const r of REGIONS) {
  const { browser, page } = await open(r, { w: 900, h: 600 })
  await page.waitForTimeout(3500)
  const rep = await page.evaluate(() => window.__ch1Audit ?? null)
  all.push(rep ?? { region: r, MISSING: true })
  const o = rep?.overlaps?.length ?? -1, f = rep?.floating?.length ?? -1
  console.log(`${r.padEnd(15)} objects=${String(rep?.counted ?? '?').padStart(3)}  overlaps=${o}  offGround=${f}`)
  for (const h of (rep?.overlaps ?? []).slice(0,6)) console.log(`    ${h.a} ↔ ${h.b}  ${h.depth}m  ${Math.round(h.frac*100)}%`)
  for (const x of (rep?.floating ?? []).slice(0,6)) console.log(`    ${x.name}  ${x.gap>0?'floating':'sunk'} ${Math.abs(x.gap)}m`)
  await browser.close()
}
writeFileSync('scratchpad/audit.json', JSON.stringify(all,null,1))
