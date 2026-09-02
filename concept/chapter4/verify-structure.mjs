/* שער מבנה: כל §N מהמקור מופיע ב-„## המבנה“ פעם אחת בדיוק */
import fs from 'node:fs'
const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const src = fs.readFileSync(dir + 'SOURCE-TEXT.md', 'utf8')
const st = fs.readFileSync(dir + 'STRUCTURE.md', 'utf8')
const all = [...src.matchAll(/^### §(\d+)/gm)].map((m) => Number(m[1])).sort((a, b) => a - b)
/* רק גוף „## המבנה“ — הרשימות שאחריו מזכירות §N שוב, וזו לא הקצאה */
const body = st.slice(st.indexOf('## המבנה'), st.indexOf('## מונחים לחיצים'))
const rows = body.split('\n').filter((l) => l.startsWith('|') && !/^\|\s*(מקטע|-)/.test(l))
const seen = new Map()
for (const r of rows) {
  const cell = r.split('|')[2] ?? ''
  for (const m of cell.matchAll(/§(\d+)/g)) {
    const n = Number(m[1])
    seen.set(n, (seen.get(n) ?? 0) + 1)
  }
}
const orphans = all.filter((n) => !seen.has(n))
const dupes = [...seen.entries()].filter(([, c]) => c > 1).map(([n, c]) => `§${n}×${c}`)
const ghosts = [...seen.keys()].filter((n) => !all.includes(n)).map((n) => `§${n}`)
if (orphans.length) console.log(`✗ יתומים (${orphans.length}): ` + orphans.map((n) => '§' + n).join(' '))
if (dupes.length) console.log(`✗ כפילויות: ${dupes.join(' ')}`)
if (ghosts.length) console.log(`✗ סעיפים שלא קיימים במקור: ${ghosts.join(' ')}`)
const ok = !orphans.length && !dupes.length && !ghosts.length
console.log(ok ? `✓ כל ${all.length} הסעיפים מוקצים, פעם אחת כל אחד` : '✗ המבנה לא סוגר את המקור')
process.exit(ok ? 0 : 1)
