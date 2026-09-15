/* הקריינות נעולה על הווידאו? נמדד: הקטע הנכון, הנקודה הנכונה בתוכו,
   ומה קורה בהשהיה, בהמשך ובקפיצה. */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage({ viewport: { width: 1100, height: 700 } })
const say = console.log
await p.goto('http://localhost:3000/chapter1/end', { waitUntil: 'domcontentloaded', timeout: 120000 })
await p.waitForSelector('.ch1-film-video', { timeout: 120000 })
await p.waitForTimeout(2500)

const CUES = await p.evaluate(() => [...document.querySelectorAll('audio')].length)
say('נגן קריינות בדף:', CUES)
/* מדליקים קול — הקריינות קשורה אליו */
const btns = await p.$$('.ch1-film .hud-card-btn')
await p.$$eval('.ch1-film .hud-card-btn', a => a[1].click())
await p.waitForTimeout(1200)

const st = () => p.evaluate(() => {
  const v = document.querySelector('.ch1-film-video'), n = document.querySelector('audio')
  return { vt: +v.currentTime.toFixed(2), vp: v.paused, vm: v.muted,
           src: (n.getAttribute('src') || n.src || '').split('/').pop(),
           nt: +(n.currentTime || 0).toFixed(2), np: n.paused, nm: n.muted }
})
say('אחרי הדלקת קול:', JSON.stringify(await st()))

/* מפת התזמון מן הנתונים */
const PLAN = [[0,'01'],[10.8,'05'],[22.22,'06'],[33.73,'09'],[39.03,'10'],[48.05,'11'],[59.34,'13'],[67.86,'15'],[79.46,'17'],[84.51,'18']]
const want = t => { let c = PLAN[0]; for (const x of PLAN) if (t >= x[0]) c = x; return c }

say('\n— קפיצות לאורך הסרט: האם נשמע הקטע הנכון, מהנקודה הנכונה? —')
let bad = 0
for (const target of [3, 14, 26, 35, 42, 52, 62, 71, 81, 86]) {
  await p.evaluate(t => { document.querySelector('.ch1-film-video').currentTime = t }, target)
  await p.waitForTimeout(900)
  const s = await st()
  const w = want(s.vt)
  const into = +(s.vt - w[0]).toFixed(2)
  const drift = +(s.nt - into).toFixed(2)
  const ok = s.src === w[1] + '.mp3' && Math.abs(drift) <= 0.3
  if (!ok) bad++
  say(`  סרט ${String(s.vt).padStart(6)}ש׳ → צפוי ${w[1]}.mp3 @${into.toFixed(2)} · בפועל ${s.src} @${s.nt} · סטייה ${drift}ש׳ ${ok ? '✓' : '✗'}`)
}

say('\n— השהיה והמשך (באמצע הסרט) —')
for (const seekTo of [18, 42, 63]) {
  await p.evaluate(t => { document.querySelector('.ch1-film-video').currentTime = t }, seekTo)
  await p.waitForTimeout(900)
  await p.$$eval('.ch1-film .hud-card-btn', a => a[0].click())   /* השהיה */
  await p.waitForTimeout(700)
  const a = await st()
  await p.waitForTimeout(900)
  const held = await st()
  await p.$$eval('.ch1-film .hud-card-btn', a => a[0].click())   /* המשך */
  await p.waitForTimeout(900)
  const c = await st()
  const w = want(c.vt); const into = +(c.vt - w[0]).toFixed(2)
  const drift = +(c.nt - into).toFixed(2)
  say(`  @${seekTo}ש׳: בהשהיה הסרט ${a.vt}→${held.vt} (זז ${(held.vt-a.vt).toFixed(2)}) והקריינות ${a.np ? 'עצרה ✓' : 'המשיכה ✗'} · אחרי המשך סטייה ${drift}ש׳ ${Math.abs(drift)<=0.3?'✓':'✗'}`)
  if (Math.abs(drift) > 0.3 || !a.np) bad++
}

say('\n— כיבוי קול —')
await p.$$eval('.ch1-film .hud-card-btn', a => a[1].click())
await p.waitForTimeout(800)
const m = await st()
say(`  הסרט מושתק ${m.vm} · הקריינות ${m.np ? 'שותקת ✓' : 'ממשיכה ✗'}`)
if (!m.np) bad++
say('\nכשלים: ' + bad)
await b.close()
