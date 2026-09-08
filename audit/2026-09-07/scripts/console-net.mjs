/* קונסול, promises שנדחו ובקשות רשת שנכשלו — בכל אזור, בטעינה טבעית. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT = '/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const regions = process.argv.slice(2)
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const lines = []
for (const r of regions) {
  const page = await browser.newPage({ viewport:{width:1100,height:620} })
  const errs = [], cons = [], failed = [], bad = []
  page.on('pageerror', e => errs.push(e.message.slice(0,200)))
  page.on('console', m => { if (m.type()==='error' || m.type()==='warning') cons.push(m.type()+': '+m.text().slice(0,200)) })
  page.on('requestfailed', q => failed.push(q.url().slice(-90)+' — '+(q.failure()?.errorText ?? '')))
  page.on('response', s => { if (s.status() >= 400) bad.push(s.status()+' '+s.url().slice(-90)) })
  const url = r.startsWith('/') ? `http://localhost:3000${r}` : `http://localhost:3000/chapter1?region=${r}`
  await page.goto(url, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
    for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await page.waitForTimeout(25000)
  const uniq = (a) => [...new Set(a)]
  const block = [`== ${r}`, `  pageerror: ${errs.length}`, ...uniq(errs).slice(0,6).map(x=>'    '+x),
    `  console error/warn: ${cons.length} (ייחודיים ${uniq(cons).length})`, ...uniq(cons).slice(0,8).map(x=>'    '+x),
    `  requestfailed: ${failed.length}`, ...uniq(failed).slice(0,6).map(x=>'    '+x),
    `  HTTP>=400: ${bad.length}`, ...uniq(bad).slice(0,6).map(x=>'    '+x)]
  console.log(block.join('\n')); lines.push(...block)
  await page.close()
}
fs.writeFileSync(`${OUT}/logs/console-net.log`, lines.join('\n')+'\n')
await browser.close()
