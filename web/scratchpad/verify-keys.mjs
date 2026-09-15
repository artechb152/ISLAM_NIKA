/* „הראה מקשים" — נסגר רק בלחיצה מפורשת. */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const ctx = await b.newContext({ viewport: { width: 1000, height: 640 } })
const p = await ctx.newPage()
const say = console.log
const open = () => p.evaluate(() => !!document.querySelector('.hud-controls'))
await p.goto('http://localhost:3000/chapter1/play?region=night-camp', { waitUntil: 'domcontentloaded', timeout: 240000 })
await p.waitForFunction(() => !!window.__ch1Live, null, { timeout: 240000 })
for (let i = 0; i < 25; i++) { if (!(await p.$('.hud-dialogue'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(200) }
await p.waitForTimeout(600)
say('פתוח בהתחלה:', await open())

await p.keyboard.down('KeyW'); await p.waitForTimeout(9000); await p.keyboard.up('KeyW')
say('אחרי 9 שניות של הליכה (הסף הישן היה 6):', await open(), (await open()) ? '✓' : '✗')

await p.waitForTimeout(23000)
say('אחרי 32 שניות סה״כ (הסף הישן היה 25):', await open(), (await open()) ? '✓' : '✗')

await p.mouse.click(500, 320); await p.waitForTimeout(600)
say('אחרי לחיצה במקום אחר במסך:', await open(), (await open()) ? '✓' : '✗')
for (let i = 0; i < 15; i++) { if (!(await p.$('.hud-dialogue'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(200) }

await p.$eval('.hud-controls-close', e => e.click()); await p.waitForTimeout(500)
say('אחרי לחיצה על ה-×:', await open(), (await open()) ? '✗ עדיין פתוח' : '✓ נסגר')
say('  כפתור „מקשים" מופיע במקומו:', await p.evaluate(() => !!document.querySelector('.hud-controls-peek')))

/* נזכר בין תחנות — כל שער הוא טעינת מסמך */
await p.goto('http://localhost:3000/chapter1/play?region=border-post', { waitUntil: 'domcontentloaded', timeout: 240000 })
await p.waitForFunction(() => !!window.__ch1Live, null, { timeout: 240000 }); await p.waitForTimeout(900)
say('בתחנה הבאה — עדיין סגור:', (await open()) ? '✗ נפתח שוב' : '✓ נשאר סגור')
await p.keyboard.press('KeyH'); await p.waitForTimeout(500)
say('אחרי H:', (await open()) ? '✓ נפתח' : '✗ לא נפתח')
await p.waitForTimeout(9000)
say('ונשאר פתוח 9 שניות אחרי כן:', (await open()) ? '✓' : '✗')
await b.close()
