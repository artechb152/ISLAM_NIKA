/* חץ ההכוונה: מופיע כשצריך, מצביע על היעד הנכון, ונעלם אחרי הפעולה. */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const p = await b.newPage({ viewport: { width: 1000, height: 640 } })
const say = console.log
await p.goto('http://localhost:3000/chapter1/play?region=yemen-heights', { waitUntil: 'domcontentloaded', timeout: 240000 })
await p.waitForFunction(() => !!window.__ch1Live && !!window.__ch1Where, null, { timeout: 240000 })
const clear = async () => { for (let i = 0; i < 25; i++) { if (!(await p.$('.hud-dialogue,.ch1-find,.ch1-task'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(200) } }
await clear(); await p.waitForTimeout(500)

const W = () => p.evaluate(() => window.__ch1Where)
say('שלב בהתחלה:', (await W()).stage, '· חץ גלוי:', await p.evaluate(() => { const e = document.querySelector('.poi-guide'); return !!e && e.style.display !== 'none' }))

/* עוברים על העדויות כדי להגיע לשלב הפעולה */
const finds = (await W()).finds
for (const f of finds) {
  await p.evaluate(({ x, z }) => { const L = window.__ch1Live; L.player.x = x; L.player.z = z + 1.1 }, f)
  await p.waitForTimeout(900)
  await p.keyboard.press('KeyE'); await p.waitForTimeout(1200)
  await clear(); await p.waitForTimeout(400)
}
const w = await W()
say('אחרי העדויות — שלב:', w.stage)

const guide = () => p.evaluate(() => {
  const e = document.querySelector('.poi-guide')
  if (!e) return null
  const vis = e.style.display !== 'none'
  const r = e.getBoundingClientRect()
  return { vis, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), edge: e.classList.contains('is-edge'),
           g: window.__ch1Live.guide ? { x: +window.__ch1Live.guide.x.toFixed(1), z: +window.__ch1Live.guide.z.toFixed(1) } : null }
})
/* מתייצבים ליד התחנה ומביטים אליה — שם ההכוונה נחוצה */
const T = w.task
await p.evaluate(({ x, z }) => {
  const L = window.__ch1Live
  L.player.x = x + 2.6; L.player.z = z + 2.6
  L.yaw = Math.atan2(-(x - L.player.x), (z - L.player.z))
}, T)
await p.waitForTimeout(1600)
const g1 = await guide()
say('ליד התחנה — חץ:', JSON.stringify(g1))

/* האם הוא באמת נעול על היעד? מסובבים את המצלמה ובודקים שהחץ נוסע
   איתה — הטלה נכונה מזוזה יחד עם היעד, סמן תקוע לא. */
if (g1 && g1.vis) {
  const rows = []
  for (const dy of [-0.5, -0.25, 0, 0.25, 0.5]) {
    await p.evaluate((d) => { window.__ch1Live.yaw = window.__yaw0 === undefined ? (window.__yaw0 = window.__ch1Live.yaw) + d : window.__yaw0 + d }, dy)
    await p.waitForTimeout(4000)   /* המצלמה מתכנסת ב-lerp; ב-3fps צריך זמן */
    const gg = await guide()
    const pr = await p.evaluate(({ x, z }) => {
      const sc = window.__ch1Scene, V = sc.position.constructor
      const out = {}
      for (const h of [0.0, 0.75, 1.5, 2.25]) {
        const v = new V(x, h, z); v.project(window.__ch1Camera)
        out['h' + h] = { sx: Math.round((v.x * 0.5 + 0.5) * innerWidth), sy: Math.round((-v.y * 0.5 + 0.5) * innerHeight) }
      }
      return out
    }, g1.g)
    rows.push({ dy, arrow: [gg.x, gg.y], edge: gg.edge, proj: pr })
  }
  /* איזה גובה מתאים? בוחרים את זה שנותן את השגיאה הקטנה ביותר, ואז
     בודקים אם השגיאה קבועה — קבועה = עוגן, משתנה = לא נעול. */
  for (const h of ['h0', 'h0.75', 'h1.5', 'h2.25']) {
    const dx = rows.map(r => r.arrow[0] - r.proj[h].sx)
    const dyy = rows.map(r => r.arrow[1] - r.proj[h].sy)
    const sp = (a) => (Math.max(...a) - Math.min(...a)).toFixed(0)
    say(`  גובה ${h}: סטיית x ${dx.map(v=>v.toFixed(0)).join('/')} (פיזור ${sp(dx)}px) · סטיית y ${dyy.map(v=>v.toFixed(0)).join('/')} (פיזור ${sp(dyy)}px)`)
  }
  say('  מיקומי החץ בחמש זוויות:', JSON.stringify(rows.map(r => r.arrow)))
}

/* עוזבים את התחנה — החץ צריך להיעלם */
await p.evaluate(() => { const L = window.__ch1Live; L.player.x = 0; L.player.z = 0 })
await p.waitForTimeout(1200)
const g2 = await guide()
say('אחרי התרחקות מן התחנה:', JSON.stringify(g2), g2 && g2.vis ? '✗ נשאר על המסך' : '✓ נעלם')
await b.close()
