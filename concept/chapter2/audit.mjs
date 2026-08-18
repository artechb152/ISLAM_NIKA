/* Chapter 2's shape gate, run against the LIVE page.

   The fidelity gate (verify-chapter2.mjs) proves no sentence was invented or
   printed twice. This one proves the page has chapter 6's SHAPE — the failure
   the first two drafts shipped, and the one the reader named:
     "יותר מידי טקסט רץ, המון שטחים ריקים, משעמם, 12 חלקים זה מרגיש ארוך מידי"
     "טיפוגרפיה לא שווה" · "אלמנטים של AI"

   Every threshold below is a MEASUREMENT OF CHAPTER 6 taken on the same
   viewport, not a preference:

     top-level sections    7      (ch6: 7 — the first build had 12)
     sub-headings         ≥6      (ch6: 15 — the first build had 2)
     words per paragraph  ≥15     (ch6: 16.7 — the first build had 10.8)
     ornaments in prose    0      (ch6 puts its diamond under pillar titles only)
     centred running text  0      (ch6 never centres a paragraph)
     letterspaced labels   0      (ch6 has none)

   Requires the dev server on :3000 and puppeteer-core.
   Run: node concept/chapter2/audit.mjs [url]
*/
import puppeteer from 'puppeteer-core'
import { readFile } from 'node:fs/promises'

const URL = process.argv[2] ?? 'http://localhost:3000/chapter2'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 1000 },
})
const page = await browser.newPage()
const runtime = []
page.on('pageerror', (e) => runtime.push('pageerror: ' + String(e).slice(0, 160)))
page.on('requestfailed', (r) => runtime.push('failed request: ' + r.url().slice(-64)))

/* a plain path: this file shadows the global URL with its own `const URL` */
const PASSAGES_PATH = new globalThis.URL('../../web/src/lib/chapter2/passages.json', import.meta.url)
const PASSAGES = JSON.parse(await readFile(PASSAGES_PATH, 'utf8')).passages
await page.evaluateOnNewDocument((p) => { window.__CH2_PASSAGES__ = p }, PASSAGES)
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 })
await page.evaluate(() => document.fonts.ready)
await new Promise((r) => setTimeout(r, 1800))

/* walk the whole page once so the lazy-loaded plates actually decode — otherwise
   "image did not load" fires on every picture below the fold */
const ids = await page.evaluate(() => [...document.querySelectorAll('.article-section')].map((s) => s.id))
for (const id of ids) {
  await page.evaluate((i) => document.getElementById(i)?.scrollIntoView({ block: 'center' }), id)
  await new Promise((r) => setTimeout(r, 260))
}
await page.evaluate(() => window.scrollTo(0, 0))
await new Promise((r) => setTimeout(r, 900))

const result = await page.evaluate(() => {
  const fail = []
  const info = {}
  const secs = [...document.querySelectorAll('.article-section')]

  /* 1 · seven sections, six sub-headings — chapter 6's pacing */
  info.sections = secs.length
  if (secs.length !== 7) fail.push(`${secs.length} מקטעים ראשיים — פרק 6 עובד עם 7`)
  info.subHeadings = document.querySelectorAll('.chapter-article .ch2-sub').length
  if (info.subHeadings < 6) fail.push(`רק ${info.subHeadings} כותרות משנה — פרק 6 מציב 15`)

  /* 2 · paragraph density. A page of ten-word paragraphs is what reads as
     "טקסט רץ עם המון שטחים ריקים": a ragged line and a half, then air. */
  /* PROSE paragraphs. This counted every <p> on the page, which by now includes
     a lead line over a row, the caption on an arrow, a diagram's label, the map's
     hint and the ledger's opening line — all of them short BY DESIGN, none of
     them the thing this metric is about. Chapter 6's 16.7 is a prose figure, so
     this has to be one too, or the ruler punishes the page for having captions. */
  const LABEL = '.ch2-lead, .ch2-cycle-arm, .ch2-diagram-label, .ch2-chart-hint, .ch2-verdict-intro'
  const ps = [...document.querySelectorAll('.chapter-article p')].filter(
    (p) => p.getBoundingClientRect().width > 0 && (p.textContent || '').trim() && !p.closest(LABEL),
  )
  const counts = ps.map((p) => (p.textContent || '').trim().split(/\s+/).length)
  info.paragraphs = ps.length
  info.wordsPerParagraph = +(counts.reduce((a, c) => a + c, 0) / counts.length).toFixed(1)
  if (info.wordsPerParagraph < 15) {
    fail.push(`${info.wordsPerParagraph} מילים לפסקה — פרק 6 עומד על 16.7`)
  }

  /* 2b · THE MEASURE. Chapter 6's median paragraph runs about 84 Hebrew
     characters; its widest run the full column, and the alternation between the
     two is its rhythm.

     This chapter has been wrong in both directions. First every device carried a
     `ch` ceiling, which is a fixed pixel width dressed up as a measure and
     stopped the prose at 904px however wide the window grew. Then the ceilings
     came off entirely and every paragraph became 137 characters — twice a
     readable line, and all of them identical.

     So the gate is a RANGE, and it also requires that not every block be the
     same width. */
  const artBox = document.querySelector('.chapter-article').getBoundingClientRect()
  const proseEls = [...document.querySelectorAll('.chapter-article p')].filter(
    (x) => x.getBoundingClientRect().width > 0 && (x.textContent || '').trim().split(/\s+/).length >= 8,
  )
  const probe = document.createElement('span')
  const cs0 = getComputedStyle(proseEls[0])
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${cs0.fontFamily};font-size:${cs0.fontSize}`
  probe.textContent = 'אבגדהוזחטיכלמנסעפצקרשת אבגדהוזחטיכלמנסעפצקרשת'
  document.body.appendChild(probe)
  const glyph = probe.getBoundingClientRect().width / probe.textContent.length
  probe.remove()
  const chars = proseEls.map((x) => Math.round(x.getBoundingClientRect().width / glyph)).sort((a, c) => a - c)
  info.medianChars = chars[Math.floor(chars.length / 2)]
  if (info.medianChars > 95) fail.push(`${info.medianChars} תווים בשורה — בפרק 6 החציון הוא 84`)
  if (info.medianChars < 62) fail.push(`${info.medianChars} תווים בשורה — צר מדי, בפרק 6 החציון הוא 84`)

  /* the chapter must not be one width all the way down */
  const blockWidths = [...document.querySelectorAll('.chapter-article .ch2-body, .chapter-article figure, .chapter-article .ch2-pair, .chapter-article .ch2-diagram')]
    .map((e) => Math.round(e.getBoundingClientRect().width))
    .filter((w) => w > 0)
  info.distinctWidths = new Set(blockWidths).size
  if (info.distinctWidths < 2) fail.push('כל הבלוקים באותו רוחב — אין קצב')
  info.columnFill = Math.round((Math.max(...blockWidths) / artBox.width) * 100)
  if (info.columnFill < 97) fail.push(`שום בלוק לא ממלא את העמודה (${info.columnFill}%)`)

  /* 2c · PRESENCE. verify-chapter2.mjs proves the layout CONSUMES every fragment
     once — it cannot see whether the fragment reaches the page. §6.a spent two
     drafts behind a map toggle: not hidden, never rendered, invisible to the
     chapter's own search. Only the desert stage may hold text behind a click,
     because a click-through scene is a contract the reader is invited into. */
  info.absent = []
  {
    const flat = (t) => t.replace(/[\s„”"'.,:;()\[\]–—-]/g, '')
    const hay = flat(document.querySelector('.chapter-article').textContent)
    for (const [sec, frags] of Object.entries(window.__CH2_PASSAGES__ ?? {})) {
      for (const f of frags) {
        for (const str of [f.text, ...(f.list ?? [])].filter(Boolean)) {
          if (!hay.includes(flat(str))) info.absent.push(`${sec}.${f.id}`)
        }
      }
    }
    /* the stage's own beats are the sanctioned exception */
    const STAGE = /^§(9|10|11|12)\./
    const unexpected = [...new Set(info.absent)].filter((r) => !STAGE.test(r))
    if (unexpected.length) {
      fail.push(`קטעי מקור שלא מגיעים לעמוד כלל: ${unexpected.join(', ')}`)
    }
  }

  /* 3 · no ornament inside the prose */
  info.ornaments = document.querySelectorAll('.chapter-article .title-ornament').length
  if (info.ornaments > 0) fail.push(`עיטור בתוך המאמר: ${info.ornaments}`)

  /* 4 · the promoted-noun gesture is gone. In RUNNING prose, chapter 6's largest
     type is its sub-heading at 27px; anything bigger that is not an h1/h2/h3 is
     the invented third heading level that produced the empty space.
     Chapter 6's own declarations are exempt for the same reason they are exempt
     there — `.pillars-statement b` is 46px and is not a heading either. */
  const oversized = []
  for (const el of document.querySelectorAll('.chapter-article *')) {
    if (el.children.length) continue
    /* the banner, quotations, declarations and the full-screen stage are display
       moments, and SVG text is sized in viewBox units, not CSS px */
    if (el.closest('.ch2-hero, blockquote, .ch2-quote, .ch2-statement, .ch2-stage')) continue
    if (el.ownerSVGElement) continue
    if (['H1', 'H2', 'H3'].includes(el.tagName)) continue
    if (parseFloat(getComputedStyle(el).fontSize) > 30) {
      oversized.push(`${el.tagName}.${(el.className || '').toString().slice(0, 20)}`)
    }
  }
  info.oversized = oversized.length
  if (oversized.length) fail.push(`טיפוגרפיה מעל דרגת המשנה של פרק 6: ${oversized.join(', ')}`)

  /* 5 · chapter 6 never centres running text ON THE PAPER. Inside a full-screen
     scene it does — `.prayer-day .stage-card{text-align:center}` — because there
     the text is not a column being read down, it is a line held in the middle of
     a place. Same exemption, same reason, one selector. */
  for (const el of document.querySelectorAll('.chapter-article p, .chapter-article li')) {
    if (el.closest('.ch2-stage')) continue
    /* a LEAD is not running text — it is one sentence introducing the row under
       it, which is exactly how chapter 6 sets `.pillars-lead` over its five */
    /* an arrow's own sentence is centred ON ITS SHAFT — that is what attaches
       it to that arrow rather than to the one under it. Not running text. */
    if (el.closest('.ch2-lead, .ch2-statement, .ch2-verse, .ch2-saying, .ch2-cycle-arm')) continue
    if (getComputedStyle(el).textAlign === 'center' && (el.textContent || '').trim().length > 30) {
      fail.push(`פסקה ממורכזת: "${(el.textContent || '').trim().slice(0, 30)}…"`)
    }
  }

  /* 5b · …but it must leave the reading column SOMEWHERE. The chapter was read
     as "repetitive and not aligned like chapter 6, which plays right/centre":
     measured, chapter 6 sets 39 of 154 blocks off its right column and this one
     set 8 — five of which were inside one card. Seven sections down a single
     axis is what made every section read as the same shape. */
  const offAxis = [...document.querySelectorAll('.chapter-article .article-section *')]
    .filter((el) => !el.closest('.ch2-stage'))
    .filter((el) => el.getBoundingClientRect().width > 60)
    .filter((el) => getComputedStyle(el).textAlign === 'center')
  info.offAxis = new Set(offAxis.map((el) => el.closest('.article-section')?.id)).size
  if (info.offAxis < 3) fail.push(`הפרק כולו על ציר אחד — רק ${info.offAxis} מקטעים יוצאים מעמודת הקריאה`)

  /* 5c · and no one costume may dress three different voices. The chapter quotes
     a poem, a proverb and a hadith; the first build put all three in the same
     gold card, in three consecutive sections. */
  for (const sel of ['.ch2-quote', '.ch2-verse', '.ch2-saying', '.ch2-statement']) {
    const n = document.querySelectorAll(`.chapter-article ${sel}`).length
    if (n > 2) fail.push(`${sel} מופיע ${n} פעמים — אותה תלבושת לשלושה קולות`)
  }

  /* 6 · chapter 6 has zero small letterspaced labels; so must this */
  for (const el of document.querySelectorAll('.chapter-article *')) {
    if (el.children.length) continue
    const cs = getComputedStyle(el)
    if (parseFloat(cs.fontSize) <= 15 && parseFloat(cs.letterSpacing) >= 1 && (el.textContent || '').trim()) {
      fail.push(`תווית קטנה ומרווחת: "${(el.textContent || '').trim().slice(0, 24)}"`)
    }
  }

  /* 7 · no text burned into a photograph — a CAPTION belongs on paper.
     The banner and the full-screen stage are exempt, and for the same reason
     chapter 6 exempts its own: there the type is not labelling a picture from
     outside, it is being read INSIDE a scene, and it needs the shadow to stay
     legible over both a bleached noon and a moonlit night. */
  for (const el of document.querySelectorAll('.chapter-article figcaption, .chapter-article p, .chapter-article b')) {
    const sh = getComputedStyle(el).textShadow
    if (sh && sh !== 'none' && !el.closest('.ch2-hero, .ch2-stage')) {
      fail.push(`טקסט עם צל מעל תמונה: ${el.tagName}.${(el.className || '').toString().slice(0, 20)}`)
    }
  }

  /* 8 · only chapter 6's palette */
  const ALLOWED = new Set([
    'rgb(237,228,208)', 'rgb(243,234,214)', 'rgb(250,244,230)', 'rgb(245,236,214)',
    'rgb(216,199,163)', 'rgb(138,39,51)', 'rgb(87,24,32)', 'rgb(165,50,47)',
    'rgb(199,154,60)', 'rgb(217,180,91)', 'rgb(133,96,22)', 'rgb(60,44,29)', 'rgb(111,92,67)',
    'rgb(255,255,255)', 'rgb(0,0,0)',
    /* chapter 6's own full-screen-stage type colour, `.prayer-day .stage-card p` */
    'rgb(246,238,218)',
  ])
  for (const el of document.querySelectorAll('.chapter-article *')) {
    if (el.closest('svg') || el.tagName === 'IMG') continue
    const c = getComputedStyle(el).color.replace(/\s/g, '')
    if (!ALLOWED.has(c) && !c.startsWith('rgba')) {
      fail.push(`צבע טקסט מחוץ לפלטה: ${c} על ${el.tagName}.${(el.className || '').toString().slice(0, 24)}`)
    }
  }

  /* 9 · every image loaded, nothing overflows, nothing escapes the column */
  for (const i of document.querySelectorAll('img')) {
    if (!i.complete || i.naturalWidth === 0) fail.push('תמונה לא נטענה: ' + i.getAttribute('src'))
  }
  /* an inline graphic that collapsed to nothing still "loads" — the peninsula
     chart shipped as a 40px empty box for two drafts because its SVG was
     absolutely positioned over an image that had been removed. Only figures are
     checked (role="img"); control chevrons are meant to be 20px. */
  for (const s of document.querySelectorAll('.chapter-article svg[role="img"]')) {
    const r = s.getBoundingClientRect()
    if (r.height < 120) fail.push(`גרפיקה שלא נפרסה: svg בגובה ${Math.round(r.height)}px`)
  }
  const doc = document.documentElement
  if (doc.scrollWidth > doc.clientWidth + 1) fail.push(`גלישה אופקית ${doc.scrollWidth}>${doc.clientWidth}`)
  const art = document.querySelector('.chapter-article').getBoundingClientRect()
  for (const el of document.querySelectorAll('.chapter-article *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || el.ownerSVGElement || el.tagName === 'svg') continue
    /* the banner, the bleeding watercolour and the full-screen stage are
       deliberately full-bleed: they carry a negative inline margin so the art
       reaches the window edge. Everything else must stay in the column. */
    if (el.closest('.ch2-hero, .ch2-bleed-img, .ch2-stage, .ch2-plate.is-bleed')) continue
    if (r.right > art.right + 2 || r.left < art.left - 2) {
      fail.push(`חורג מהעמודה: ${el.tagName}.${(el.className || '').toString().slice(0, 26)}`)
    }
  }

  info.height = doc.scrollHeight
  return { fail: [...new Set(fail)], info }
})

/* 10 · mobile. Document width is not enough: anything inside `overflow:hidden`
   is CLIPPED rather than scrolled, so the stage cut 30px off the start of every
   line at 390px while this check reported a clean page. Measure each element
   against the viewport as well. */
await page.setViewport({ width: 390, height: 844, isMobile: true })
await page.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1400))
const mobile = await page.evaluate(() => {
  const out = []
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
    out.push('גלישה אופקית במובייל')
  }
  for (const el of document.querySelectorAll('.chapter-article *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || el.ownerSVGElement) continue
    if (r.left < -1 || r.right > window.innerWidth + 1) {
      out.push(`נחתך במובייל: ${el.tagName}.${(el.className || '').toString().slice(0, 24)} (${Math.round(r.left)}…${Math.round(r.right)})`)
    }
  }
  /* every control must clear 24×24 — the stage dots shipped at 11×11 */
  for (const el of document.querySelectorAll('.chapter-article button, .chapter-article a, .chapter-article select')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0) continue
    if (r.width < 24 || r.height < 24) {
      out.push(`יעד מגע קטן מ־24px: ${el.tagName}.${(el.className || '').toString().slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
  }
  return [...new Set(out)]
})
result.fail.push(...mobile)
result.fail.push(...runtime)

await browser.close()

console.log(
  `מקטעים: ${result.info.sections} · כותרות משנה: ${result.info.subHeadings} · ` +
    `מילים לפסקה: ${result.info.wordsPerParagraph} · תווים בשורה: ${result.info.medianChars} · רוחבי בלוק: ${result.info.distinctWidths} · ` +
    `מקטעים היוצאים מהציר: ${result.info.offAxis} · ` +
    `גובה: ${result.info.height}px`,
)
if (result.fail.length) {
  console.error('❌\n' + result.fail.map((f) => ' - ' + f).join('\n'))
  process.exit(1)
}
console.log('✅ צורת פרק 6: 7 מקטעים, כותרות משנה בפנים, פסקאות בנפח מלא, אפס עיטורים, אפס גלישות')
