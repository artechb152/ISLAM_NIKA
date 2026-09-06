/* מוריד לקרקע כל מה שהביקורת מדדה כמרחף, לפי הפער שנמדד בפועל. */
import { open } from './lib-probe.mjs'
import fs from 'node:fs'
const FILE = { 'border-post': 'border', 'night-camp': 'camp' }
for (const region of process.argv.slice(2)) {
  const { browser, page } = await open(region, { w: 800, h: 500 })
  await page.waitForTimeout(6000)
  const a = await page.evaluate(() => window.__ch1Audit)
  await browser.close()
  if (!a.floating.length) { console.log(region, '— nothing floating'); continue }
  const path = `src/lib/chapter1/${FILE[region] ?? region}-layout.json`
  const src = fs.readFileSync(path, 'utf8')
  const ind = (src.match(/\n(\s+)"/) || [, '  '])[1].length
  const d = JSON.parse(src)
  let n = 0
  for (const f of a.floating) {
    const m = /^prop:(.+?)\.glb@(-?[\d.]+),(-?[\d.]+)$/.exec(f.name)
    if (!m) { console.log('  ? cannot parse', f.name); continue }
    const [, model, x, z] = m
    const p = d.props.find((q) => q.model === model && Math.abs(q.x - +x) < 0.06 && Math.abs(q.z - +z) < 0.06)
    if (!p) { console.log('  ? not found', f.name); continue }
    p.sink = +((p.sink ?? 0) + f.gap).toFixed(3)
    n++
    console.log(`  ${f.name}  gap ${f.gap} → sink ${p.sink}`)
  }
  fs.writeFileSync(path, JSON.stringify(d, null, ind) + (src.endsWith('\n') ? '\n' : ''))
  console.log(region, `— ${n} props brought down to the ground`)
}
