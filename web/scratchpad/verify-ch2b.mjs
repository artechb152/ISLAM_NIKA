import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errs = []
p.on('pageerror', e => errs.push(e.message.slice(0, 90)))
await p.goto('http://localhost:3000/chapter2', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2500)
const T = () => p.evaluate(() => document.body.textContent)
const want = [
  ['בנו של אברהם המקראי','§0 ייחוס'],['מקומו של אברהם','§3 מקאם אבראהים'],['טוּפַאן','§2 טופאן נוח'],
  ['שוכני המדבר נקראים','§4 בדווים'],['השבטים הנודדים התפרנסו','§6 בלי סוגריים'],
  ['קַחְטָאן','§7 קחטאן'],['יוקטן המקראי','§7 יוקטן'],['ייתכן והוא מזוהה','§8'],
  ['שרידות בתנאי המדבר','§12 שרידות'],['החיים במדבר הציבו','§13'],
  ['אני ואחי נגד בן-דודי','§38 הפתגם'],['הסולידריות השבטית','§38 הסבר'],
  ['שַׁרַף','§39 כבוד'],['גואל הדם','§41 תנ״ך'],
  ['מנהגים לא טובים','§40 מבוא'],['מזרחנים בעת החדשה','§28 מזרחנים'],
  ['פוליתאיזם','§27'],['מבנה שחור גדול','§31'],
  ['מוסר, ערכים ודרך חיים','§34'],['אבירות גברית נטמעו','§35'],
  ['עשיית משפט צדק','§35 תנאים'],['היה קשה להציב גבולות','§36 סייג'],
  ['חשיבות גדולה מאוד בהבנת התרבות השבטית','§42 סיום'],
  ['גבריות / אבירות','כותרת משנה'],['מֻרוּאַה','מרואה מנוקד'],['וַאד אַלְבָּנָאת','ואד אלבנאת'],["תַ'אְר",'תאר'],['עַצַבִּיַּה','עצביה'],
]
const t = await T()
let miss = []
for (const [w, l] of want) if (!t.includes(w)) miss.push(l)
console.log(`תיקוני פרק 2 בעמוד: ${want.length - miss.length}/${want.length}` + (miss.length ? '  ✗ ' + JSON.stringify(miss) : '  ✓ הכול'))
const gone = [['בנו הבכור','§0 ישן'],['המסורת המוסלמית מספרת כי בחצי','§5 ישן'],['הטלת גורלות','§36 ישן'],['(בדואים','§6 ישן'],['תרבות שבטית טרום','שם ישן']]
let still = []
for (const [w, l] of gone) if (t.includes(w)) still.push(l)
console.log(`נוסחים ישנים שירדו: ${gone.length - still.length}/${gone.length}` + (still.length ? '  ✗ ' + JSON.stringify(still) : '  ✓'))
console.log('שגיאות JS:', errs.length, errs.slice(0, 2))
console.log('כותרת:', await p.title())
await b.close()
