/* A measuring probe for chapter 3, not a gate. It answers one question:
   WHERE is the page crowded, and WHAT repeats?

   Run with the dev server up:  node scripts/ch2-probe.mjs (from web/)        */
import puppeteer from 'puppeteer-core'
import { mkdir } from 'node:fs/promises'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PAGE = process.env.PAGE ?? 'http://localhost:3000/chapter2'
const OUT = new URL('../../concept/chapter2/probe/', import.meta.url)
await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 })
await page.goto(PAGE, { waitUntil: 'networkidle0', timeout: 60000 })

/* let every reveal fire so nothing is measured at opacity 0 */
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 40))
  }
  window.scrollTo(0, 0)
})
await new Promise((r) => setTimeout(r, 400))

/* force every reveal on: a fullPage shot otherwise photographs opacity:0 */
await page.addStyleTag({ content: '[data-reveal]{opacity:1!important;transform:none!important}' })
/* a fullPage shot does not paint lazy images that were never in a viewport */
await page.evaluate(() => document.querySelectorAll('img[loading]').forEach((i) => i.removeAttribute('loading')))
await new Promise((r) => setTimeout(r, 900))
await new Promise((r) => setTimeout(r, 200))

const report = await page.evaluate(() => {
  const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
  const secs = [...document.querySelectorAll('.article-section')]

  const sections = secs.map((s) => {
    const paras = [...s.querySelectorAll('p')].filter((p) => words(p.textContent) > 3)
    const wpp = paras.map((p) => words(p.textContent))
    const r = s.getBoundingClientRect()
    return {
      id: s.id,
      heightPx: Math.round(r.height),
      paragraphs: paras.length,
      words: wpp.reduce((a, b) => a + b, 0),
      wordsPerPara: paras.length ? +(wpp.reduce((a, b) => a + b, 0) / paras.length).toFixed(1) : 0,
      subs: s.querySelectorAll('.ch2-sub').length,
      devices: {
        lineage: s.querySelectorAll('.ch2-lineage').length,
        heavens: s.querySelectorAll('.ch2-heavens').length,
        readings: s.querySelectorAll('.ch2-readings').length,
        verse: s.querySelectorAll('.ch2-verse').length,
        statement: s.querySelectorAll('.ch2-statement').length,
        plate: s.querySelectorAll('.ch2-plate').length,
      },
      /* what shape does this section have, read top to bottom? */
      shape: [...s.children]
        .map((c) => {
          if (c.classList.contains('section-heading')) return 'H'
          if (c.classList.contains('ch2-sub')) return 'h'
          if (c.classList.contains('ch2-hero')) return 'BANNER'
          if (c.classList.contains('ch2-plate')) return 'IMG'
          if (c.classList.contains('ch2-verse')) return 'VERSE'
          if (c.classList.contains('ch2-statement')) return 'STMT'
          if (c.classList.contains('ch2-lineage')) return 'LINEAGE'
          if (c.classList.contains('ch2-heavens')) return 'LADDER'
          if (c.classList.contains('ch2-readings')) return 'READINGS'
          if (c.tagName === 'P') return 'p'
          return c.tagName.toLowerCase()
        })
        .join(' '),
    }
  })

  /* every image actually on the page, by src — the repetition suspect */
  const imgs = {}
  for (const el of document.querySelectorAll('img')) {
    const k = el.getAttribute('src') || '(none)'
    imgs[k] = (imgs[k] ?? 0) + 1
  }
  const bg = getComputedStyle(document.querySelector('.ch2-hero-media')).backgroundImage
  if (bg && bg !== 'none') {
    const m = bg.match(/url\("?([^")]+)"?\)/)
    if (m) imgs[m[1].replace(location.origin, '') + ' (background)'] = 1
  }

  /* the vertical gaps actually rendered between sibling blocks */
  const gaps = []
  for (const s of secs) {
    const kids = [...s.children]
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1].getBoundingClientRect()
      const b = kids[i].getBoundingClientRect()
      gaps.push(Math.round(b.top - a.bottom))
    }
  }

  /* the audit's own test: a section is off-axis if it centres something or
     places a block wider than 920px */
  const colW = document.querySelector('.ch2-body')?.getBoundingClientRect().width ?? 0
  const offAxis = secs.filter((s) =>
    [...s.querySelectorAll('*')].some((el) => {
      const w = el.getBoundingClientRect().width
      const cs = getComputedStyle(el)
      return w > 920 || (cs.textAlign === 'center' && el.textContent.trim().length > 20)
    }),
  ).map((s) => s.id)

  const article = document.querySelector('.chapter-article')
  return {
    totalHeight: Math.round(article.scrollHeight),
    sections,
    imgs,
    gaps: [...new Set(gaps)].sort((a, b) => a - b),
    offAxis,
    colW: Math.round(colW),
  }
})

console.log(`\nגובה המאמר: ${report.totalHeight}px  (${(report.totalHeight / 1000).toFixed(1)} אלף פיקסלים)\n`)
console.log('מקטע'.padEnd(12), 'גובה'.padEnd(8), 'פסקאות', 'מילים', 'מ/פס', 'משנה')
for (const s of report.sections) {
  console.log(
    s.id.padEnd(12),
    String(s.heightPx).padEnd(8),
    String(s.paragraphs).padEnd(7),
    String(s.words).padEnd(6),
    String(s.wordsPerPara).padEnd(5),
    String(s.subs),
  )
}
console.log('\nהצורה של כל מקטע, מלמעלה למטה:')
for (const s of report.sections) console.log(`  ${s.id.padEnd(12)} ${s.shape}`)

console.log('\nתמונות בדף:')
for (const [k, n] of Object.entries(report.imgs)) console.log(`  ${n}×  ${k}`)

console.log('\nמרווחים אנכיים שנמדדו בפועל:', report.gaps.join(', '))

await page.screenshot({ path: new URL('full.png', OUT).pathname.slice(1), fullPage: true })
console.log('\nצילום מלא: concept/chapter3/probe/full.png')
await browser.close()
