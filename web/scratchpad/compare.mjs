import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } })
const out = {}
for (const ch of ['chapter2', 'chapter6', 'chapter4']) {
  const page = await ctx.newPage()
  await page.goto(`http://localhost:3000/${ch}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
  await page.waitForTimeout(6000)
  out[ch] = await page.evaluate(() => {
    const art = document.querySelector('.chapter-article')
    const ps = [...document.querySelectorAll('.chapter-article p')].filter((p) => p.innerText.trim().length > 40)
    const cs = (el) => el ? getComputedStyle(el) : null
    const p0 = ps[0]
    const s = cs(p0)
    const words = ps.map((p) => p.innerText.trim().split(/\s+/).length)
    const secs = [...document.querySelectorAll('.article-section')]
    return {
      colWidth: art ? Math.round(art.getBoundingClientRect().width) : null,
      paraWidth: p0 ? Math.round(p0.getBoundingClientRect().width) : null,
      fontSize: s?.fontSize, lineHeight: s?.lineHeight,
      paraGap: ps[1] && p0 ? Math.round(ps[1].getBoundingClientRect().top - p0.getBoundingClientRect().bottom) : null,
      paragraphs: ps.length,
      medianWords: words.slice().sort((a,b)=>a-b)[Math.floor(words.length/2)],
      totalWords: words.reduce((a,b)=>a+b,0),
      maxWords: Math.max(...words),
      sections: secs.length,
      medianSectionPx: (() => { const h = secs.map(s=>Math.round(s.getBoundingClientRect().height)).sort((a,b)=>a-b); return h[Math.floor(h.length/2)] })(),
      totalPx: Math.round(document.body.scrollHeight),
    }
  })
  await page.close()
}
console.log(JSON.stringify(out, null, 1))
await b.close()
