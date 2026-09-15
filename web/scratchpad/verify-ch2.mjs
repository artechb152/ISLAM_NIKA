import { chromium } from 'playwright-core'
const want = ['בנו של אברהם המקראי','מַקַּאם אִבְּרָאהִים','שוכני המדבר נקראים','קַחְטָאן','יוקטן המקראי',
  'ייתכן והוא מזוהה','שרידות בתנאי המדבר','החיים במדבר הציבו','אני ואחי נגד בן-דודי','שַׁרַף','גואל הדם',
  'מזרחנים בעת החדשה','פוליתאיזם','מבנה שחור גדול','מוסר, ערכים ודרך חיים','היה קשה להציב גבולות',
  'חשיבות גדולה מאוד בהבנת התרבות השבטית','טוּפַאן','אבירות','הגירה']
const gone = ['בנו הבכור של אברהם','המסורת המוסלמית מספרת כי בחצי האי ערב','הטלת גורלות','השבטים הנוודיים (בדואים','תרבות שבטית טרום עליית האסלאם']
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errs = []
p.on('pageerror', e => errs.push(e.message.slice(0, 90)))
await p.goto('http://localhost:3000/chapter2', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2500)
const t = await p.evaluate(() => document.body.innerText)
const html = await p.evaluate(() => document.body.textContent)
const miss = want.filter(w => !html.includes(w))
const hidden = want.filter(w => html.includes(w) && !t.includes(w))
const still = gone.filter(w => html.includes(w))
console.log(`תיקונים שמופיעים בעמוד: ${want.length - miss.length}/${want.length}` + (miss.length ? '  ✗ חסר: ' + JSON.stringify(miss) : '  ✓'))
if (hidden.length) console.log('  (קיימים ב-DOM אך לא גלויים כרגע — לשונית/שלב אחר):', JSON.stringify(hidden))
console.log(`נוסחים ישנים שירדו: ${gone.length - still.length}/${gone.length}` + (still.length ? '  ✗ נשאר: ' + JSON.stringify(still) : '  ✓'))
console.log('כותרת הדף:', await p.title())
console.log('שגיאות JS:', errs.length, errs.slice(0, 3))
/* דף הפרקים */
await p.goto('http://localhost:3000/chapters', { waitUntil: 'networkidle', timeout: 90000 })
await p.waitForTimeout(1500)
console.log('דף הנחיתה — כותרת:', await p.$eval('.hero-title', e => e.textContent.trim()), '· משנה:', await p.$eval('.hero-sub', e => e.textContent.trim()))
const card = await p.evaluate(() => document.body.innerText.includes('השבטיות בחצי האי ערב'))
console.log('שם פרק 2 בכרטיס מעודכן:', card ? '✓' : '✗')
await b.close()
