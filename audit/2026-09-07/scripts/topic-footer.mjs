/* „להשלמת השורה" אחרי שנגמרו הנושאים: פותחים שיחה עם נושאים (ראאווי במחנה
   הלילה — שני נושאים), בוחרים נושא, ומתעדים את מצב שורת הכפתורים אחרי כל
   לחיצת רווח. הבאג: אחרי סוף התשובה מופיע שוב „להשלמת השורה" (השורה
   האחרונה מוקלדת מחדש) לפני שחוזרים הנושאים / „סיום שיחה". */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const S = '/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad'
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page); const say = console.log
await K.start('night-camp')
const state = () => page.evaluate(() => {
  const d = document.querySelector('.hud-dialogue'); if (!d) return 'NO-DIALOGUE'
  if (d.querySelector('.hud-choices')) return 'CHOICES(' + d.querySelectorAll('.hud-choices .hud-card-btn').length + ')'
  const b = [...d.querySelectorAll('.hud-dialogue-actions .hud-card-btn')].map(b => b.textContent.trim())
  return b.join('|')
})
/* מגיעים אל השיחה עם הנושאים: שיחות ההגעה נסגרות ברווח, ובין שיחה
   לשיחה ממתינים — ראאווי פותח את הנושאים מעצמו אחרי כמה שניות */
let opened = false
for (let i = 0; i < 240; i++) {
  const s = await state()
  if (s.startsWith('CHOICES')) { opened = true; break }
  if (s !== 'NO-DIALOGUE') await page.keyboard.press('Space')
  await page.waitForTimeout(500)
}
say('שיחה עם נושאים נפתחה?', opened, '·', await state())
const seq = []
let picked = false, after = 0
for (let i = 0; i < 40; i++) {
  const s = await state(); seq.push(s)
  if (s.startsWith('CHOICES') && !picked) {
    await page.click('.hud-choices .hud-card-btn:not(.is-primary)'); picked = true; seq.push('→ נבחר נושא'); await page.waitForTimeout(700); continue
  }
  if (picked && (s.startsWith('CHOICES') || s.includes('סיום שיחה') || s.includes('לעבודה'))) { after++; if (after >= 1) break }
  if (s === 'NO-DIALOGUE') break
  await page.keyboard.press('Space'); await page.waitForTimeout(650)
}
say('רצף:', seq.join(' » '))
const i = seq.indexOf('→ נבחר נושא')
const tail = seq.slice(i + 1)
const retyped = tail.some((s, k) => k > 0 && s.startsWith('להשלמת השורה') && tail[k - 1].startsWith('לשורה הבאה'))
say('אחרי סוף התשובה חזרה הקלדה מחדש של השורה האחרונה?', retyped ? 'כן — הבאג קיים' : 'לא')
say('המצב הסופי:', tail[tail.length - 1])
await page.goto('http://localhost:3000/chapter1/end', { waitUntil:'networkidle', timeout: 90000 }); await page.waitForTimeout(2000)
const skip = await page.$('.ch1-film button:has-text("דלג")'); if (skip) { await skip.click(); await page.waitForTimeout(1500) }
await page.screenshot({ path: `${S}/new-end2.png` })
await browser.close()
