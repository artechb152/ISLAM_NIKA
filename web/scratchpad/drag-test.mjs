/* בדיקת גרירה מקצה לקצה: שומע את השיחה, אוסף עדויות, גורר, ומוודא. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page, errors } = await open(region)
const go = async (x, z) => page.evaluate(({ x, z }) => {
  const L = window.__ch1Live; L.player.x = x; L.player.z = z; L.lastDrag = performance.now()
}, { x, z })
const clearDialogue = async () => {
  for (let k = 0; k < 60; k++) {
    if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) return
    await page.keyboard.press('Space'); await page.waitForTimeout(200)
  }
}
let w = await page.evaluate(() => window.__ch1Where)
console.log(`${region}: actual=${w.region} task=${w.task?.id} stage=${w.stage} host=${w.host}`)
console.log(`  objective: ${w.objective}`)

// 1) שיחת הפתיחה
if (w.stage === 'brief') {
  for (const c of w.cast) {
    await go(c.x, c.z + 1.6); await page.waitForTimeout(900)
    await page.keyboard.press('KeyE'); await page.waitForTimeout(500)
    await clearDialogue()
  }
  // ראאווי, אם אין דמות באזור
  for (let i = 0; i < 8; i++) {
    w = await page.evaluate(() => window.__ch1Where)
    if (w.stage !== 'brief') break
    await page.keyboard.press('KeyR'); await page.waitForTimeout(500); await clearDialogue()
  }
  w = await page.evaluate(() => window.__ch1Where)
  console.log(`  after talking: stage=${w.stage}`)
}

// 2) העדויות
/* עמידה תמיד בצד הפנימי של העדות: נקודה 1.1 מ' לכיוון מרכז האזור.
   ‎`f.z + 1.2` דחף את השחקן אל תוך שער היציאה ליד כמה עדויות, והמשחק
   עבר אזור באמצע הבדיקה. */
const inward = (x, z, d = 1.1) => { const m = Math.hypot(x, z) || 1; return [x - (x / m) * d, z - (z / m) * d] }
for (const f of w.finds) {
  if (f.done) continue
  await go(...inward(f.x, f.z)); await page.waitForTimeout(800)
  const rr = await page.evaluate(() => window.__ch1Where?.region)
  if (rr !== region) { console.log('  !! travelled to', rr, '— aborting'); break }
  for (let k = 0; k < 3; k++) {
    const st = await page.evaluate((id) => window.__ch1Where.finds.find((q) => q.id === id)?.done, f.id)
    if (st) break
    await clearDialogue()
    await page.keyboard.press('KeyE'); await page.waitForTimeout(700)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await clearDialogue()
  }
}
w = await page.evaluate(() => window.__ch1Where)
console.log(`  finds: ${w.finds.filter((f) => f.done).length}/${w.finds.length}  stage=${w.stage}`)

// 3) הגרירה
if (w.task) {
  // ודא שאין כרטיס או פאנל שמכסה את הקנבס
  for (let i = 0; i < 6; i++) {
    const open = await page.evaluate(() => !!document.querySelector('.ch1-find-card, .hud-task, .hud-dialogue, .ch1-overlay'))
    if (!open) break
    await page.keyboard.press('Escape'); await page.waitForTimeout(350)
  }
  const blocking = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
    return el ? el.tagName + '.' + (el.className || '') : 'none'
  })
  console.log('  element under centre:', String(blocking).slice(0, 60))
  await go(w.task.x, w.task.z + 2.0)
  await page.waitForTimeout(6000)
  for (let round = 0; round < 6; round++) {
    const t = await page.evaluate(() => window.__ch1Task)
    if (!t) { console.log('  no __ch1Task'); break }
    const item = t.props.find((p) => !p.placed)
    if (!item) { console.log('  all placed'); break }
    const bins = t.bins && t.bins.length ? t.bins : [t.target]
    let ok = false
    for (const b of bins) {
      // חכה שהחפץ ייעצר במקומו לפני שמנסים להרים אותו שוב
      await page.waitForTimeout(1400)
      const fresh0 = (await page.evaluate(() => window.__ch1Task)).props.find((p) => p.id === item.id)
      if (fresh0) { item.x = fresh0.x; item.y = fresh0.y }
      await page.mouse.move(item.x, item.y)
      await page.mouse.down()
      for (let s = 1; s <= 10; s++) {
        await page.mouse.move(item.x + (b.x - item.x) * s / 10, item.y + (b.y - item.y) * s / 10)
        await page.waitForTimeout(45)
      }
      await page.mouse.up()
      await page.waitForTimeout(1300)
      const w2 = await page.evaluate(() => window.__ch1Where)
      if (w2.task?.solved) { console.log(`  ✓ ${item.id} placed — task solved`); ok = true; break }
      const t2 = await page.evaluate(() => window.__ch1Task)
      const now = t2.props.find((p) => p.id === item.id)
      if (now?.placed) { console.log(`  ✓ ${item.id} placed`); ok = true; break }
      const fresh = t2.props.find((p) => p.id === item.id)
      item.x = fresh.x; item.y = fresh.y
    }
    if (!ok) { console.log(`  ✗ ${item.id} would not drop into any zone`); break }
    const wz = await page.evaluate(() => window.__ch1Where)
    if (wz.task?.solved) break
  }
  w = await page.evaluate(() => window.__ch1Where)
  console.log(`  task solved: ${w.task.solved}  stage=${w.stage}`)
}
if (errors.length) console.log('  ERRORS', [...new Set(errors)].slice(0, 3))
await browser.close()
