const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true })
const page = await browser.newPage({ viewport:{width:1180,height:940} })
await page.goto('http://localhost:3000/exams', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(2000)
for (const b of await page.$$('.xr-chapters button')) { const t=(await b.textContent()||'').trim()
  const on=(await b.getAttribute('aria-pressed'))==='true'; const want=/^0?1/.test(t)
  if (want!==on) await b.click({timeout:2000}).catch(()=>{}) }
const lens = await page.$$('.xr-lengths button'); if (lens.length) await lens[0].click().catch(()=>{})
await page.click('.xr-go').catch(()=>{})
await page.waitForTimeout(2000)
console.log(await page.evaluate(()=>{
  const walk = (el, d=0) => { if (d>4 || !el) return ''
    let s=''
    for (const c of el.children) {
      const cls = String(c.className||'').slice(0,40)
      const txt = (c.textContent||'').replace(/\s+/g,' ').trim().slice(0,50)
      s += '  '.repeat(d) + c.tagName.toLowerCase() + (cls?'.'+cls.split(' ').join('.'):'') + ' — "' + txt + '"\n'
      s += walk(c, d+1)
    }
    return s }
  const main = document.querySelector('main, .xr-article, article') || document.body
  return walk(main).slice(0, 2600)
}))
await browser.close()
