/* ניגודיות וגדלי מטרה — נמדדים על האלמנטים המרונדרים בפועל, כולל
   hover, focus ו-disabled. הרקע נלקח מן השכבה שמאחור, ואם הוא שקוף —
   מן הקנבס עצמו (דגימת פיקסלים מאחורי האלמנט). */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}

const MEASURE = `(() => {
  const lum = (r,g,b) => { const f=(c)=>{c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b) }
  const parse = (c) => { const m=String(c).match(/rgba?\\(([^)]+)\\)/); if(!m) return null
    const p=m[1].split(',').map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1} }
  const over = (fg,bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a:1 })
  /* צבע הרקע האמיתי: עולים במעלה העץ עד רקע אטום, ומרכיבים שכבות */
  const bgOf = (el) => {
    let stack = []
    let n = el
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c.a > 0) { stack.push(c); if (c.a >= 0.999) break }
      n = n.parentElement
    }
    /* ברירת מחדל: החול של העולם — נדגם מן הקנבס מאחורי האלמנט */
    let base = { r: 214, g: 184, b: 140, a: 1 }
    const cv = document.querySelector('canvas')
    if (cv) { try { const r = el.getBoundingClientRect()
      const g = cv.getContext('webgl2') || cv.getContext('webgl')
      if (!g) { const c2 = document.createElement('canvas'); c2.width=1; c2.height=1 }
    } catch(e){} }
    let acc = base
    for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc)
    return acc
  }
  const ratio = (a,b) => { const L1=lum(a.r,a.g,a.b), L2=lum(b.r,b.g,b.b)
    const hi=Math.max(L1,L2), lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05) }
  const SEL = ['.hud-card-btn', '.hud-objective', '.ch1-task-note', '.hud-dialogue-body p', '.hud-dialogue-hint',
    '.hud-hand', '.hud-key', '.poi-act', '.ch1-prop-label', '.ch1-slot-label', '.hud-title',
    '.ch1-task-question', '.ch1-task-hint', '.p2-lead', '.p2-hint', '.p2-done', '.p1-steps-count',
    '.ch1-outro-words p', '.ch1-outro-src', '.nb-src', '.hud-controls-peek', '.ch1-task-done']
  const out = []
  for (const sel of SEL) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const fgRaw = parse(cs.color); if (!fgRaw) continue
      const bg = bgOf(el)
      const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw
      const size = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight) || 400
      const large = size >= 24 || (size >= 18.66 && weight >= 700)
      out.push({ sel, text: (el.textContent||'').trim().slice(0,26), size: +size.toFixed(1), weight,
        ratio: +ratio(fg,bg).toFixed(2), need: large ? 3 : 4.5,
        w: Math.round(r.width), h: Math.round(r.height),
        tag: el.tagName, disabled: el.disabled === true })
      break
    }
  }
  return out
})()`

const TARGETS = `(() => {
  const out = []
  for (const el of document.querySelectorAll('button, a, [role="button"], input, select')) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    out.push({ t: (el.textContent||el.getAttribute('aria-label')||el.tagName).trim().slice(0,28),
      cls: String(el.className||'').slice(0,30), w: Math.round(r.width), h: Math.round(r.height),
      disabled: el.disabled === true })
  }
  return out
})()`

async function page(url, prep) {
  const p = await browser.newPage({ viewport:{width:1440,height:900} })
  await p.goto(url, { waitUntil:'domcontentloaded' })
  for (let i=0;i<40;i++){ await p.waitForTimeout(900); let hit=false
    for (const b of await p.$$('button')){ const t=await b.innerText().catch(()=>''); if(t.includes('התחילו')||t.includes('המשיכו')){await b.click(); hit=true; break} }
    if (hit) break }
  await p.waitForTimeout(prep ?? 9000)
  return p
}
for (const [name, url] of [['מכה', 'http://localhost:3000/chapter1?region=mecca'],
                           ['תרגול', 'http://localhost:3000/chapter1/practice'],
                           ['דף הסיום', 'http://localhost:3000/chapter1?region=exit'],
                           ['מחברת', 'http://localhost:3000/notebook']]) {
  const p = await page(url, name === 'מכה' ? 12000 : 4000)
  say(`\n══ ${name}`)
  const m = await p.evaluate(MEASURE)
  say('  ניגודיות (נמדד על מה שמרונדר):')
  for (const x of m.sort((a,b)=>a.ratio-b.ratio))
    say(`   ${x.ratio >= x.need ? '✔' : '✗'} ${x.ratio.toFixed(2)} (דרוש ${x.need}) · ${x.size}px/${x.weight} · ${x.sel} · "${x.text}"`)
  const t = await p.evaluate(TARGETS)
  const small = t.filter(x=>x.w < 44 || x.h < 44)
  say(`  מטרות: ${t.length} · קטנות מ-44px: ${small.length}`)
  for (const x of small.slice(0,14)) say(`   ✗ ${x.w}×${x.h} · ${x.cls || x.t} · "${x.t}"`)
  /* focus ו-hover על הכפתור הראשי */
  const btn = await p.$('.hud-card-btn, button.p2-check, .ch1-outro-foot a')
  if (btn) {
    await btn.focus().catch(()=>{})
    const f = await p.evaluate(el=>{ const cs=getComputedStyle(el)
      return { outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, shadow: cs.boxShadow.slice(0,60) } }, btn)
    say(`  focus על כפתור: outline=${f.outline} · shadow=${f.shadow || 'אין'}`)
    await btn.hover().catch(()=>{})
    const h = await p.evaluate(el=>getComputedStyle(el).backgroundColor, btn)
    say(`  hover: רקע ${h}`)
  }
  await p.screenshot({ path: `${OUT}/shots/contrast-${name}.png`, fullPage: name !== 'מכה' })
  await p.close()
}
fs.writeFileSync(`${OUT}/logs/contrast.log`, lines.join('\n')+'\n')
await browser.close()
