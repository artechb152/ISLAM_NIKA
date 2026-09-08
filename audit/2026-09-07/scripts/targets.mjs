/* גדלי מטרות, גלישת טקסט וחפיפה — אחרי הגדלת הכפתורים. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}
const CHECK = `(() => {
  const out = { small: [], wrapped: [], overflow: [], overlap: [], panels: [] }
  const vis = (el) => { const cs=getComputedStyle(el); const r=el.getBoundingClientRect()
    return cs.visibility!=='hidden' && cs.display!=='none' && r.width>2 && r.height>2 }
  const btns = [...document.querySelectorAll('button, a[href], [role="button"]')].filter(vis)
  for (const el of btns) {
    const r = el.getBoundingClientRect()
    const cls = String(el.className||'').slice(0,26)
    const t = (el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,24)
    if (r.height < 44 || r.width < 44) out.small.push(\`\${Math.round(r.width)}×\${Math.round(r.height)} · \${cls} · "\${t}"\`)
    /* גלישה: יותר משורה אחת בכפתור שאמור להיות בשורה אחת */
    const cs = getComputedStyle(el)
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35
    const inner = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    if (cs.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 2)
      out.overflow.push(\`\${cls} · "\${t}" · scroll \${el.scrollWidth}>\${el.clientWidth}\`)
    if (cs.whiteSpace !== 'nowrap' && inner > lh * 1.8)
      out.wrapped.push(\`\${cls} · "\${t}" · \${Math.round(inner)}px על \${Math.round(lh)}px שורה\`)
  }
  /* חפיפה בין כפתורים */
  for (let i=0;i<btns.length;i++) for (let j=i+1;j<btns.length;j++) {
    const a=btns[i].getBoundingClientRect(), b=btns[j].getBoundingClientRect()
    if (btns[i].contains(btns[j]) || btns[j].contains(btns[i])) continue
    const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left)
    const oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)
    if (ox>3 && oy>3) out.overlap.push(\`\${String(btns[i].className).slice(0,20)} × \${String(btns[j].className).slice(0,20)} (\${Math.round(ox)}×\${Math.round(oy)})\`)
  }
  /* חלוניות שגדלו מעבר למסך */
  for (const el of document.querySelectorAll('.hud-panel, .ch1-task, .ch1-find, .hud-dialogue')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    out.panels.push(\`\${String(el.className).slice(0,26)} \${Math.round(r.width)}×\${Math.round(r.height)}\${r.bottom>innerHeight+2||r.top<-2||r.right>innerWidth+2||r.left<-2?' ✗ חורג':''}\`)
  }
  return out
})()`
async function open(url, wait, after) {
  const page = await browser.newPage({ viewport:{width:1440,height:900} })
  await page.goto(url, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await page.waitForTimeout(900); let hit=false
    for (const b of await page.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await page.waitForTimeout(wait)
  if (after) await after(page)
  return page
}
for (const [name,url,wait,after] of [
  ['מכה · שיחה','http://localhost:3000/chapter1?region=mecca',12000, null],
  ['תרגול','http://localhost:3000/chapter1/practice',4000, null],
  ['דף הסיום','http://localhost:3000/chapter1?region=exit',4000, null],
  ['בחינות','http://localhost:3000/exams',3000, null],
]) {
  const page = await open(url, wait, after)
  const r = await page.evaluate(CHECK)
  say(`\n══ ${name}`)
  say(`  קטנות מ-44: ${r.small.length}`); for (const x of r.small.slice(0,10)) say('   · ' + x)
  say(`  גלישת שורה: ${r.wrapped.length}`); for (const x of r.wrapped.slice(0,6)) say('   · ' + x)
  say(`  טקסט חתוך: ${r.overflow.length}`); for (const x of r.overflow.slice(0,6)) say('   · ' + x)
  say(`  חפיפה: ${r.overlap.length}`); for (const x of r.overlap.slice(0,6)) say('   · ' + x)
  say(`  חלוניות: ${r.panels.join(' · ') || 'אין'}`)
  await page.screenshot({ path: `${OUT}/shots/targets-${name.split(' ')[0]}.png`, fullPage: name !== 'מכה · שיחה' })
  await page.close()
}
fs.writeFileSync(`${OUT}/logs/targets.log`, lines.join('\n')+'\n')
await browser.close()
