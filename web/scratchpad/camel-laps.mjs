/* בודק את הגמלים לאורך כמה הקפות מלאות — לא בפריים אחד.
   דוגם את המסלול בזמן ומודד כל נקודה מול לפידים, מדורות, מבנים,
   שולחנות, חפצים אינטראקטיביים וגמלים אחרים. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page } = await open(region, { w: 700, h: 440 })
await page.waitForFunction(()=>window.__ch1Live, null, { timeout: 120000 })
await page.waitForTimeout(6000)
// אין גישה נוחה ל-THREE מבחוץ; נשען על הביקורת עצמה שרצה שוב ושוב.
const samples = []
for (let i = 0; i < 72; i++) {
  const a = await page.evaluate(() => window.__ch1Audit)
  if (a) samples.push({ un: a.unapproved.length, names: a.unapproved.map((h) => `${h.a} ↔ ${h.b} ${Math.round(h.frac*100)}%`) })
  await page.waitForTimeout(2600)
}
const bad = new Map()
for (const s of samples) for (const n of s.names) bad.set(n, (bad.get(n) ?? 0) + 1)
const camelHits = [...bad].filter(([n]) => /camel|cart/.test(n))
console.log(`${region}: ${samples.length} דגימות על פני ~${Math.round(samples.length*2.6)} שניות`)
console.log(`   חפיפות שנצפו בכלל: ${bad.size} · מהן של גמלים: ${camelHits.length}`)
for (const [n, c] of [...bad].sort((a,b)=>b[1]-a[1]).slice(0, 8)) console.log(`   ${c}/${samples.length}  ${n}`)
await browser.close()
