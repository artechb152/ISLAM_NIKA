/* מוצא לדמות מקום שבו היא באמת פנויה — מול התיבות שנמדדו בעולם,
   לא מול עיגול ההתנגשות שה-JSON מצהיר עליו. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page } = await open(region, { w: 800, h: 500 })
await page.waitForTimeout(3500)
const a = await page.evaluate(() => window.__ch1Audit)
const boxes = a.sizes.filter((s) => s.name.startsWith('prop:') || s.name.startsWith('task:'))
const casts = a.sizes.filter((s) => s.name.startsWith('cast:'))
const bad = new Set(a.unapproved.flatMap((h) => [h.a, h.b]).filter((n) => n.startsWith('cast:')))
const inter = (b1, b2) => {
  const ox = Math.min(b1[3], b2[3]) - Math.max(b1[0], b2[0])
  const oy = Math.min(b1[4], b2[4]) - Math.max(b1[1], b2[1])
  const oz = Math.min(b1[5], b2[5]) - Math.max(b1[2], b2[2])
  if (ox <= 0 || oy <= 0 || oz <= 0) return 0
  const vol = ox * oy * oz
  const v1 = (b1[3]-b1[0])*(b1[4]-b1[1])*(b1[5]-b1[2])
  return vol / v1
}
for (const c of casts) {
  if (!bad.has(c.name)) continue
  const b = c.box
  const cx = (b[0]+b[3])/2, cz = (b[2]+b[5])/2
  const hw = (b[3]-b[0])/2 + 0.25, hd = (b[5]-b[2])/2 + 0.25
  let best = null
  for (let step = 0.5; step <= 8 && !best; step += 0.35) {
    for (let k = 0; k < 32; k++) {
      const t = (k/32)*Math.PI*2
      const nx = cx + Math.cos(t)*step, nz = cz + Math.sin(t)*step
      const cand = [nx-hw, b[1], nz-hd, nx+hw, b[4], nz+hd]
      let worst = 0
      for (const o of boxes) worst = Math.max(worst, inter(cand, o.box))
      for (const o of casts) if (o.name !== c.name) worst = Math.max(worst, inter(cand, o.box))
      if (worst < 0.02) { best = { nx: +nx.toFixed(3), nz: +nz.toFixed(3), step }; break }
    }
  }
  console.log(`${c.name}  at ${cx.toFixed(2)},${cz.toFixed(2)}  →  ${best ? `${best.nx},${best.nz} (+${best.step.toFixed(2)}m)` : 'NO CLEAR SPOT'}`)
}
await browser.close()
