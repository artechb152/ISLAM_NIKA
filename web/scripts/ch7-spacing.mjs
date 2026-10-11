/* מדידת ריווחים: הרווח הנראה בין כל שני בלוקים עוקבים, מסווג לפי סוג המעבר,
   בפרק 5, פרק 6 ופרק 7, באותו רוחב. הרווח הנראה = מסוף התוכן הנראה של בלוק
   לתחילת התוכן הנראה של הבא — כלומר בתוך שורת ציור+טקסט נמדד הטקסט, לא הקופסה.
   node scripts/ch7-spacing.mjs [width] */
import { chromium } from 'playwright-core'
const W = Number(process.argv[2] || 1440)
const b = await chromium.launch({ channel: 'chrome', headless: true })
const kind = (t) => /section-heading/.test(t) ? 'H2' : /^h3/.test(t) ? 'H3' : /^p/.test(t) ? 'P' : /chapter-end/.test(t) ? 'END' : /hero/.test(t) ? 'HERO' : /art|tall|figure.ch5-lin/.test(t) ? 'ART' : 'DEV'
for (const ch of [5, 6, 7]) {
  const p = await b.newPage({ viewport: { width: W, height: 900 }, reducedMotion: 'reduce' })
  await p.goto(`http://localhost:3000/chapter${ch}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(900)
  const rows = await p.evaluate(() => {
    const out = []
    const leaf = (el) => {
      const cls = el.className?.toString() ?? ''
      const kids = [...el.children].filter((k) => getComputedStyle(k).display !== 'none')
      if (el.tagName === 'SECTION' || /^(bleed-aside|ch7-farewell|ch5-split|ch5-figrow)( |$)|bleed-aside-body|farewell-copy|split-copy|figrow-copy|scrolly-text|article-subsection/.test(cls)) { kids.forEach(leaf); return }
      const r = el.getBoundingClientRect()
      if (r.height < 2 || r.width < 2) return
      out.push({ sec: el.closest('section')?.id ?? 'end', tag: el.tagName.toLowerCase() + (cls ? '.' + cls.split(' ')[0] : ''), top: r.top + scrollY, bot: r.bottom + scrollY })
    }
    document.querySelectorAll('.chapter-article > section, .chapter-article > .chapter-end').forEach(leaf)
    return out.sort((a, b) => a.top - b.top)
  })
  const pairs = {}
  let prev = null
  const lines = []
  for (const r of rows) {
    const k = kind(r.tag)
    if (prev && k !== 'ART' && prev.k !== 'ART') {
      const key = `${prev.k}→${k}` + (prev.sec !== r.sec ? ' (section)' : '')
      const g = Math.round(r.top - prev.bot)
      ;(pairs[key] ??= []).push(g)
      lines.push(`${r.sec.padEnd(10)} ${key.padEnd(18)} ${String(g).padStart(5)}  ${r.tag.slice(0, 30)}`)
    }
    if (k !== 'ART') prev = { ...r, k }
  }
  console.log(`\n=== chapter ${ch} @${W}`)
  for (const [k, v] of Object.entries(pairs).sort()) console.log(`${k.padEnd(20)} n=${String(v.length).padStart(2)}  median ${String(v.sort((a, b) => a - b)[v.length >> 1]).padStart(4)}  [${v.join(', ')}]`)
  if (ch === 7) console.log('\n' + lines.join('\n'))
  await p.close()
}
await b.close()
