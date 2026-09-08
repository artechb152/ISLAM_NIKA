const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true })
const page = await browser.newPage({ viewport:{width:1180,height:940} })
await page.goto('http://localhost:3000/chapter1/practice', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(3000)
console.log(await page.evaluate(()=>{
  const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)}
  const parse=c=>{const m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return null
    const p=m[1].split(',').map(parseFloat);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
  const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1})
  const bgOf=el=>{let n=el,stack=[]
    while(n&&n!==document.documentElement){const c=parse(getComputedStyle(n).backgroundColor)
      if(c&&c.a>0){stack.push(c);if(c.a>=0.999)break} n=n.parentElement}
    let acc={r:255,g:255,b:255,a:1}
    for(let i=stack.length-1;i>=0;i--) acc=over(stack[i],acc)
    return acc}
  const ratio=(a,b)=>{const L1=lum(a.r,a.g,a.b),L2=lum(b.r,b.g,b.b)
    return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)}
  const out=[]
  for (const el of document.querySelectorAll('.hud-card-btn, button.p2-check, .p2-options button, .p2-bank button')) {
    const r=el.getBoundingClientRect(); if(r.width<2) continue
    const cs=getComputedStyle(el); const fgr=parse(cs.color); if(!fgr) continue
    const bg=bgOf(el); const fg=fgr.a<1?over(fgr,bg):fgr
    out.push(`${ratio(fg,bg).toFixed(2)} · ${cs.color} על ${cs.backgroundColor} · op=${cs.opacity} · ${el.disabled?'מושבת':'פעיל'} · ${String(el.className).slice(0,24)} · "${el.textContent.trim().slice(0,22)}"`)
  }
  return out.slice(0,12).join('\n')
}))
await browser.close()
