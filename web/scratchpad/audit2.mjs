import { open } from './lib-probe.mjs'
import { writeFileSync } from 'node:fs'
const REGIONS = ['yemen-heights','night-camp','border-post','narrow-pass','loading-road','yathrib','monastery','mecca','exit']
const SCENERY = /boulder|basalt|rocks|cliff|mudtower|drywall|terrace|ridge|dune/
const all = []
for (const r of REGIONS) {
  const { browser, page } = await open(r, { w: 800, h: 500 })
  await page.waitForTimeout(3500)
  const rep = await page.evaluate(() => window.__ch1Audit)
  const size = Object.fromEntries((rep.sizes||[]).map(s=>[s.name,s]))
  const vol = (n) => { const s=size[n]; return s ? s.w*s.h*s.d : 0 }
  // דמות בתוך גאומטריה — הסוג שהעין תופסת מיד
  const cast = (rep.overlaps||[]).filter(h => /^cast:/.test(h.a) || /^cast:/.test(h.b))
  // פרופ קטן שבלוע בתוך מבנה — לא שני סלעים שנשענים זה על זה
  const buried = (rep.overlaps||[]).filter(h => {
    if (SCENERY.test(h.a) && SCENERY.test(h.b)) return false
    if (/^cast:/.test(h.a) || /^cast:/.test(h.b)) return false
    return h.frac > 0.55 && Math.min(vol(h.a), vol(h.b)) < 4
  })
  all.push({ region: r, cast, buried, floating: rep.floating })
  console.log(`\n== ${r}  cast-in-geometry=${cast.length}  small-prop-buried=${buried.length}  offGround=${rep.floating.length}`)
  for (const h of cast.slice(0,5)) console.log(`   CAST  ${h.a} ↔ ${h.b}  ${h.depth}m ${Math.round(h.frac*100)}%`)
  for (const h of buried.slice(0,5)) console.log(`   PROP  ${h.a} ↔ ${h.b}  ${h.depth}m ${Math.round(h.frac*100)}%`)
  for (const f of rep.floating.slice(0,5)) console.log(`   AIR   ${f.name} ${f.gap>0?'floating':'sunk'} ${Math.abs(f.gap)}m`)
  await browser.close()
}
writeFileSync('scratchpad/audit2.json', JSON.stringify(all,null,1))
