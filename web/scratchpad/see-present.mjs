import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: false })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.addInitScript(() => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem('ch1:arrived:border-post:v1', '1')
  // envoy כבר מוצה כדי ש-E יפתח את התחנה מיד
  localStorage.setItem('ch1:notebook:v1', JSON.stringify({
    seen: ['envoy-empires', 'envoy-sasanian'], entries: [3, 4], region: 'border-post', found: [], solved: [],
  }))
})
await page.goto('http://localhost:3000/chapter1?region=border-post', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
for (const b of await page.$$('button')) {
  const t = await b.innerText().catch(() => '')
  if (t.includes('התחילו') || t.includes('המשיכו')) { await b.click(); break }
}
await page.waitForFunction(() => window.__ch1Live, null, { timeout: 60000 })
await page.waitForFunction(() => { const e = document.querySelector(".ch1-arrive"); return !e || e.classList.contains("is-gone") }, null, { timeout: 30000 })
await page.waitForTimeout(2500)
for (let i = 0; i < 12; i++) {
  if (!(await page.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await page.keyboard.press('Space'); await page.waitForTimeout(350)
}
// לתחנה בלי עדויות — לצלם מצב נעול
await page.evaluate(() => window.__ch1Live.player.set(0.4, 0, -1.6))
await page.waitForTimeout(800)
await page.keyboard.press('KeyE')
await page.waitForTimeout(1000)
await page.screenshot({ path: 'scratchpad/present-locked.png' })
const lockedCount = await page.evaluate(() => document.querySelectorAll('.ch1-task-card button.is-locked').length)
await page.keyboard.press('Escape')
await page.waitForTimeout(600)
// לאסוף את שתי העדויות
const finds = await page.evaluate(() => window.__ch1Statics ? null : null)
// מיקומי finds מהדאטה: נשלוף מהחלון דרך fetch של הקובץ? פשוט יותר: teleport לפי known spots
const spots = await page.evaluate(async () => {
  const r = await fetch('/_next/static/chunks/nothing').catch(() => null)
  return null
})
// שליפה מהמסמך: המרקרים של finds מוקרנים — נקרא מיקומים מ-live
const findSpots = await page.evaluate(() => (window.__ch1Region && window.__ch1Region.finds) ? window.__ch1Region.finds : null)
console.log('locked buttons:', lockedCount, 'findSpots:', JSON.stringify(findSpots))
await browser.close()
