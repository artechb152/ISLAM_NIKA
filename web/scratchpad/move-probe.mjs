/* אודיט תנועה — המדידה רצה בתוך הדף, פריים אחר פריים, ולכן היא רואה
   רעד שדגימה דרך הרשת מחמיצה. */
import { chromium } from 'playwright-core'
const REGION = process.argv[2] || 'yemen-heights'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const p = await b.newPage({ viewport: { width: 800, height: 500 } })
await p.goto(`http://localhost:3000/chapter1/play?region=${REGION}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
await p.waitForFunction(() => !!window.__ch1Live && !!window.__ch1Statics, null, { timeout: 240000 })
/* סוגרים כל שיחה שנפתחה מעצמה — כל עוד היא פתוחה המקשים חסומים */
for (let i = 0; i < 40; i++) {
  if (!(await p.$('.hud-dialogue'))) break
  await p.keyboard.press('Escape'); await p.waitForTimeout(250)
}
await p.waitForTimeout(400)
const dlgOpen = !!(await p.$('.hud-dialogue'))

const cols = await p.evaluate(() => window.__ch1Statics.map(c => ({ x: c.x, z: c.z, r: c.r })))
const deep = []
for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) {
  const a = cols[i], c = cols[j]; const d = Math.hypot(a.x - c.x, a.z - c.z)
  const pen = a.r + c.r - d
  if (pen > 0.4) deep.push({ x: (a.x + c.x) / 2, z: (a.z + c.z) / 2, pen: +pen.toFixed(2), r: Math.max(a.r, c.r) })
}
deep.sort((a, c) => c.pen - a.pen)
console.log(`${REGION}: ${cols.length} קוליידרים · ${deep.length} חפיפות עמוקות · שיחה פתוחה: ${dlgOpen}`)

async function run(name, from, seconds) {
  await p.evaluate(({ x, z }) => {
    const L = window.__ch1Live
    L.player.x = x; L.player.z = z; L.yaw = 0; L.keys.clear()
    window.__rec = []
    const tick = () => { const l = window.__ch1Live; window.__rec.push([l.player.x, l.player.z, performance.now()]); window.__recId = requestAnimationFrame(tick) }
    window.__recId = requestAnimationFrame(tick)
  }, from)
  await p.waitForTimeout(200)
  await p.keyboard.down('KeyW')
  await p.waitForTimeout(seconds * 1000)
  await p.keyboard.up('KeyW')
  await p.waitForTimeout(200)
  const r = await p.evaluate(() => { cancelAnimationFrame(window.__recId); const a = window.__rec; window.__rec = []; return a })
  if (r.length < 5) return { name, frames: r.length, note: 'לא נרשמו פריימים' }
  /* W עם yaw=0 → הכיוון הרצוי הוא -z */
  let travelled = 0, back = 0, backMax = 0, stalls = 0, moved = 0
  for (let i = 1; i < r.length; i++) {
    const dx = r[i][0] - r[i-1][0], dz = r[i][1] - r[i-1][1]
    const step = Math.hypot(dx, dz)
    travelled += step
    if (i > 10) {
      if (step < 0.0008) stalls++; else moved++
      const along = -dz
      if (along < -0.0008) { back++; if (-along > backMax) backMax = -along }
    }
  }
  const net = Math.hypot(r.at(-1)[0] - r[0][0], r.at(-1)[1] - r[0][1])
  const secs = (r.at(-1)[2] - r[0][2]) / 1000
  return { name, frames: r.length, fps: +(r.length / secs).toFixed(0),
           travelled: +travelled.toFixed(2), net: +net.toFixed(2),
           stallFrames: stalls, movingFrames: moved,
           backFrames: back, maxBackStep: +backMax.toFixed(4) }
}

const out = []
out.push(await run('שטח פתוח (בסיס)', { x: 0, z: 8 }, 2.5))
for (const d of deep.slice(0, 3)) {
  out.push(await run(`אל חפיפה ${d.pen}מ׳ @${d.x.toFixed(1)},${d.z.toFixed(1)}`,
    { x: +d.x.toFixed(2), z: +(d.z + d.r + 2.0).toFixed(2) }, 3))
}
const big = cols.slice().sort((a, c) => c.r - a.r)[0]
out.push(await run(`שפשוף לאורך מכשול גדול r=${big.r}`, { x: +(big.x + big.r + 0.25).toFixed(2), z: +(big.z + 2.5).toFixed(2) }, 3))
for (const o of out) console.log('  ', JSON.stringify(o))
await b.close()
