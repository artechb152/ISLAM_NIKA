/* מדידת יישורים: כל בלוק במאמר — קצה ימני (קצה הקריאה), קצה שמאלי, רוחב, והרווח מהבלוק
   הקודם — בפרק 7 מול פרק 5, באותו רוחב מסך. node scripts/ch7-align.mjs [width] */
import { chromium } from 'playwright-core'
const W = Number(process.argv[2] || 1440)
const b = await chromium.launch({ channel: 'chrome', headless: true })
for (const ch of [5, 7]) {
  const p = await b.newPage({ viewport: { width: W, height: 900 }, reducedMotion: 'reduce' })
  await p.goto(`http://localhost:3000/chapter${ch}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  const rows = await p.evaluate(() => {
    const col = document.querySelector('.chapter-article').getBoundingClientRect()
    const out = []
    const leaf = (el) => {
      const kids = [...el.children].filter((k) => getComputedStyle(k).display !== 'none')
      const cls = el.className?.toString() ?? ''
      if (/bleed-aside$|bleed-aside |ch7-farewell$|ch5-split|ch5-figrow/.test(cls) || el.tagName === 'SECTION') { kids.forEach(leaf); return }
      if (/bleed-aside-body|ch7-farewell-copy|ch5-split-copy|ch5-figrow-copy/.test(cls)) { kids.forEach(leaf); return }
      const r = el.getBoundingClientRect()
      if (r.height < 2) return
      const cs = getComputedStyle(el)
      out.push({ sec: el.closest('section')?.id ?? 'end', tag: el.tagName.toLowerCase() + (cls ? '.' + cls.split(' ')[0] : ''), top: Math.round(r.top + scrollY), bot: Math.round(r.bottom + scrollY), R: Math.round(col.right - r.right), L: Math.round(r.left - col.left), w: Math.round(r.width), ta: cs.textAlign })
    }
    document.querySelectorAll('.chapter-article > section, .chapter-article > .chapter-end').forEach(leaf)
    out.sort((a, b) => a.top - b.top)
    return { col: [Math.round(col.left), Math.round(col.width)], rows: out }
  })
  console.log(`\n=== chapter ${ch} @${W} · column x=${rows.col[0]} w=${rows.col[1]}   (R = gap to reading edge, L = gap to outer edge)`)
  let prev = null
  for (const r of rows.rows) {
    console.log(`${r.sec.padEnd(10)} ${r.tag.slice(0, 34).padEnd(34)} gap ${String(prev == null ? "-" : r.top - prev).padStart(5)} h ${String(r.bot - r.top).padStart(4)}  R ${String(r.R).padStart(4)}  L ${String(r.L).padStart(4)}  w ${String(r.w).padStart(4)}  ${r.ta}`)
    prev = Math.max(prev ?? 0, r.bot)
  }
  await p.close()
}
await b.close()
