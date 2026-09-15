/* אימות בדפדפן אמיתי: הליכה חזיתית אל מכשול מבודד — האם זזים, והאם
   נכנסים אל תוך גוף המכשול? (headless רץ ~3fps, ולכן נמדדת התוצאה
   ולא החלקות — לחלקות יש הסימולציה ב-60fps.) */
import { chromium } from 'playwright-core'
const REGION = process.argv[2] || 'yathrib'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: false,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const p = await b.newPage({ viewport: { width: 700, height: 440 } })
await p.goto(`http://localhost:3000/chapter1/play?region=${REGION}`, { waitUntil: 'domcontentloaded', timeout: 240000 })
await p.waitForFunction(() => !!window.__ch1Live && !!window.__ch1Statics, null, { timeout: 240000 })
for (let i = 0; i < 30; i++) { if (!(await p.$('.hud-dialogue'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(200) }
await p.waitForTimeout(400)

const targets = await p.evaluate(() => {
  const cs = window.__ch1Statics.map(c => ({ x: c.x, z: c.z, r: c.r }))
  return cs.filter(c => c.r >= 0.8 && c.r <= 3 && cs.every(o => o === c || Math.hypot(o.x-c.x, o.z-c.z) > c.r + o.r + 1.5)).slice(0, 4)
})
console.log(`${REGION}: ${targets.length} מכשולים מבודדים לבדיקה`)
for (const t of targets) {
  await p.evaluate(({ x, z, r }) => {
    const L = window.__ch1Live
    L.player.x = x; L.player.z = z + r + 1.6; L.yaw = 0; L.keys.clear()
    window.__pen = 0
    window.__t = { x, z, r }
    const tick = () => {
      const l = window.__ch1Live, T = window.__t
      const gap = Math.hypot(l.player.x - T.x, l.player.z - T.z) - T.r
      if (gap < window.__pen || window.__pen === 0) window.__pen = gap
      window.__id = requestAnimationFrame(tick)
    }
    window.__id = requestAnimationFrame(tick)
  }, t)
  const from = await p.evaluate(() => ({ x: window.__ch1Live.player.x, z: window.__ch1Live.player.z }))
  /* כל פאנל פתוח חוסם את המקשים (ראו את מטפל המקלדת ב-Game.tsx) */
  for (let i = 0; i < 25; i++) {
    const busy = await p.evaluate(() => !!document.querySelector('.hud-dialogue,.ch1-find,.ch1-task'))
    if (!busy) break
    await p.keyboard.press('Escape'); await p.waitForTimeout(220)
  }
  await p.keyboard.down('KeyW')
  await p.waitForTimeout(300)
  const keyOn = await p.evaluate(() => [...window.__ch1Live.keys].join(','))
  await p.waitForTimeout(3200); await p.keyboard.up('KeyW')
  if (!keyOn.includes('w')) console.log('    ⚠ המקש לא נרשם:', JSON.stringify(keyOn))
  await p.waitForTimeout(300)
  const r = await p.evaluate(() => { cancelAnimationFrame(window.__id)
    return { x: window.__ch1Live.player.x, z: window.__ch1Live.player.z, pen: window.__pen } })
  const moved = Math.hypot(r.x - from.x, r.z - from.z)
  const past = r.z < t.z - t.r   /* עבר אל הצד הרחוק */
  console.log(`  מכשול r=${t.r} @${t.x.toFixed(1)},${t.z.toFixed(1)} · זז ${moved.toFixed(2)}מ׳ · הגיע לצד השני: ${past} · מרווח מזערי מגוף המכשול ${r.pen.toFixed(2)}מ׳ ${r.pen < 0 ? '✗ חדר!' : '✓'}`)
}
await b.close()
