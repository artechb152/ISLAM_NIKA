/* מוכיח שכל מפגש מתחיל בשורה הראשונה, מתקדם בלחיצה אחת, ונרשם. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page, errors } = await open(region)
const go = async (x,z)=>page.evaluate(({x,z})=>{const L=window.__ch1Live;L.player.x=x;L.player.z=z;L.lastDrag=performance.now()},{x,z})
const shown = () => page.evaluate(() => {
  const el = document.querySelector('.hud-dialogue')
  if (!el) return null
  const p = el.querySelector('p.is-full')
  const btns = [...el.querySelectorAll('.hud-dialogue-actions button, .hud-choices button')].map(b=>b.innerText.trim())
  return { who: el.querySelector('.hud-title')?.innerText?.trim(), text: p?.innerText?.trim() ?? '', btns }
})
const w0 = await page.evaluate(()=>window.__ch1Where)
console.log(`== ${region}`)
let opened = 0, problems = []
for (const c of (w0.cast.length ? w0.cast : [{ x: w0.finds[0]?.x ?? 0, z: (w0.finds[0]?.z ?? 0) }])) {
  await go(c.x, c.z + 1.7); await page.waitForTimeout(1300)
  for (let topic = 0; topic < 7; topic++) {
    // סגור מה שפתוח
    for (let k=0;k<40;k++){ if(!(await page.evaluate(()=>!!document.querySelector('.hud-dialogue')))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.keyboard.press('Space'); await page.waitForTimeout(200) }
    await page.keyboard.press('KeyE'); await page.waitForTimeout(1100)
    const first = await shown()
    if (!first) break
    opened++
    const before = await page.evaluate(()=>window.__ch1Where.seen ?? null)
    // כמה שורות יש כאן, ומה כל לחיצה עושה
    let lines = [first.text]
    for (let n=0;n<12;n++){
      const btnRow = (await shown())?.btns ?? []
      if (btnRow.some(b=>b.includes('סיום שיחה'))) break
      const prev = (await shown())?.text
      await page.keyboard.press('Space'); await page.waitForTimeout(650)
      const now = await shown()
      if (!now) break
      if (now.text === prev && !btnRow.some(b=>b.includes('השלמת'))) problems.push(`לחיצה לא שינתה דבר: "${prev?.slice(0,32)}…"`)
      if (now.text !== prev) lines.push(now.text)
    }
    const end = await shown()
    console.log(`  [${opened}] ${first.who} · ${lines.length} שורות · כפתורים: ${JSON.stringify(end?.btns ?? [])}`)
    console.log(`      פותח ב: "${first.text.slice(0,54)}…"`)
    if (!end?.btns?.some(b=>b.includes('סיום שיחה')) && !end?.btns?.some(b=>b.includes('מספיק לי'))) problems.push('לא הגיע לכפתור סיום')
    await page.keyboard.press('Space'); await page.waitForTimeout(800)
  }
}
const w = await page.evaluate(()=>window.__ch1Where)
console.log(`  שיחות שנפתחו: ${opened} · נרשמו במחברת: ${w.notebook} · seen: ${w.seen.length} · שלב: ${w.stage}`)
if (w.seen.length < opened) problems.push(`נפתחו ${opened} אך נרשמו רק ${w.seen.length}`)
if (problems.length) console.log('  בעיות:', [...new Set(problems)].slice(0,6))
if (errors.length) console.log('  JS:', [...new Set(errors)].slice(0,3))
await browser.close()
