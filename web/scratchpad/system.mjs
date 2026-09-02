import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } })
for (const ch of ['chapter2', 'chapter6', 'chapter4']) {
  const page = await ctx.newPage()
  await page.goto(`http://localhost:3000/${ch}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
  await page.waitForTimeout(8000)
  const out = await page.evaluate(() => {
    const art = document.querySelector('.chapter-article')
    if (!art) return null
    const H = art.scrollHeight
    /* type scale actually used */
    const sizes = {}
    for (const el of art.querySelectorAll('h1,h2,h3,p,li,figcaption,b,span')) {
      const t = (el.innerText || '').trim()
      if (t.length < 3) continue
      const cs = getComputedStyle(el)
      const k = `${Math.round(parseFloat(cs.fontSize))}px`
      sizes[k] = (sizes[k] || 0) + 1
    }
    /* how many distinct block elements per screenful */
    const blocks = [...art.children].flatMap((s) => [...s.children])
    const perScreen = blocks.length / (H / 950)
    /* interactive things */
    const interactive = art.querySelectorAll('button,[role=tab],a[href^="#"],input').length
    /* colours actually painted on backgrounds */
    const bgs = new Set()
    for (const el of art.querySelectorAll('*')) {
      const c = getComputedStyle(el).backgroundColor
      if (c && c !== 'rgba(0, 0, 0, 0)') bgs.add(c)
    }
    return {
      height: H,
      sections: art.querySelectorAll('.article-section').length,
      topSizes: Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 6),
      blocksPerScreen: Number(perScreen.toFixed(1)),
      interactive,
      bgColours: [...bgs],
      figures: art.querySelectorAll('figure,img').length,
    }
  })
  console.log(ch, JSON.stringify(out))
  await page.close()
}
await b.close()
