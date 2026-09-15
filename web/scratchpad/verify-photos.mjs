import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
for (const [w, h] of [[1440, 1000], [1920, 1080], [860, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const bad = []
  p.on('pageerror', e => bad.push('JS'))
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + '') })
  await p.goto('http://localhost:3000/chapter2', { waitUntil: 'networkidle', timeout: 120000 })
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } scrollTo(0, 0) })
  await p.waitForTimeout(1600)
  const m = await p.evaluate(() => {
    const R = e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), cy: Math.round(r.top + r.height / 2) } }
    const st = document.querySelector('.ch2-lineage-text'), sp = document.querySelector('.ch2-lineage-photo')
    const split = document.querySelector('.ch2-lineage-split')
    const mi = document.querySelector('.ch2-mecca-illus'), mb = document.querySelector('.ch2-mecca-body')
    const f = e => getComputedStyle(e.querySelector('img')).filter
    const head = document.querySelector('#lineage .section-heading')
    return {
      text: st && R(st), photo: sp && R(sp), gap: split && getComputedStyle(split).columnGap,
      align: split && getComputedStyle(split).alignItems,
      leadGap: head && st ? Math.round(R(st).t - R(head).b) : null,
      filter: sp ? f(sp) : null, meccaFilter: mi ? f(mi) : null,
      capGap: sp ? Math.round(R(sp.querySelector('figcaption')).t - R(sp.querySelector('img')).b) : null,
      mecca: mi && R(mi), meccaBody: mb && R(mb),
      gutter: getComputedStyle(document.documentElement).getPropertyValue('--content-gutter').trim(),
      flowLead: getComputedStyle(document.documentElement).getPropertyValue('--flow-lead').trim(),
    }
  })
  const dy = m.text && m.photo ? Math.abs(m.text.cy - m.photo.cy) : null
  console.log(`${w}×${h}`)
  console.log(`  פתיחה: מרכז טקסט ${m.text?.cy} · מרכז תמונה ${m.photo?.cy} · הפרש ${dy}px ${dy !== null && dy < 12 ? '✓ ממורכזת' : (w < 900 ? '(עמודה אחת)' : '✗')}`)
  console.log(`  רווח בין עמודות ${m.gap} (--content-gutter ${m.gutter}) · יישור ${m.align} · מרחק מהכותרת ${m.leadGap}px (--flow-lead ${m.flowLead})`)
  console.log(`  פילטר: ${m.filter}`)
  console.log(`  מכה: תמונה ${m.mecca?.l}–${m.mecca?.r} · פילטר ${m.meccaFilter} · כיתוב ${m.capGap}px מתחת לתמונה · תקלות ${bad.length}`)
  await p.close()
}
await b.close()
