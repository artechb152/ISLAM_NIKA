/* בדיקת תקינות מבנית לכל 72 השאלות — לא תחליף לביקורת תוכן. */
import fs from 'node:fs'
const bank = JSON.parse(fs.readFileSync('/Users/nikagreenbaum/ISLAM_NIKA/web/src/lib/exams/banks/ch1.json','utf8'))
const qs = Array.isArray(bank) ? bank : (bank.questions || bank.items || [])
const out = []
const bad = []
const norm = (t) => String(t||'').replace(/\s+/g,' ').trim()
for (const q of qs) {
  const errs = []
  const opts = q.options || []
  const rights = opts.filter(o=>o.right)
  if (q.type === 'single') {
    if (rights.length !== 1) errs.push(`single עם ${rights.length} תשובות נכונות`)
    if (opts.length < 3) errs.push(`רק ${opts.length} אפשרויות`)
  }
  if (q.type === 'multi') {
    if (rights.length < 2) errs.push(`multi עם ${rights.length} נכונות`)
    if (rights.length === opts.length) errs.push('כל האפשרויות נכונות')
  }
  if (q.type === 'match') {
    const pairs = q.pairs || []
    if (!pairs.length) errs.push('match בלי pairs')
    const lefts = pairs.map(p=>norm(p.left)), rs = pairs.map(p=>norm(p.right))
    if (new Set(lefts).size !== lefts.length) errs.push('צד שמאל כפול')
    if (new Set(rs).size !== rs.length) errs.push('צד ימין כפול')
  }
  if (q.type === 'open') {
    if (!q.model) errs.push('open בלי model')
    if (!Array.isArray(q.points)) errs.push('open בלי points כרשימה')
    else if (q.points.length < 2 || q.points.length > 4) errs.push(`open עם ${q.points.length} נקודות מפתח (החוזה: 2–4)`)
    if (!q.ok) errs.push('open בלי משוב')
  }
  const texts = opts.map(o=>norm(o.text))
  if (new Set(texts).size !== texts.length) errs.push('אפשרות כפולה')
  for (let i=0;i<texts.length;i++) for (let j=i+1;j<texts.length;j++)
    if (texts[i] && texts[j] && (texts[i].includes(texts[j]) || texts[j].includes(texts[i]))) errs.push(`אפשרות מוכלת באחרת: "${texts[j].slice(0,30)}"`)
  if (!q.prompt || norm(q.prompt).length < 8) errs.push('שאלה קצרה מדי')
  if (!q.sources) errs.push('בלי מקור §')
  if (norm(q.prompt).length > 220) errs.push(`שאלה ארוכה (${norm(q.prompt).length} תווים)`)
  for (const t of texts) if (t.length > 130) errs.push(`אפשרות ארוכה (${t.length})`)
  if (!q.ok) errs.push('בלי משוב')
  out.push({ id: q.id, type: q.type, src: q.sources, n: opts.length, right: rights.length, errs })
  if (errs.length) bad.push(`${q.id} (${q.type}): ${errs.join(' · ')}`)
}
/* כפילויות בין שאלות */
const seen = new Map()
for (const q of qs) {
  const key = norm(q.prompt).slice(0,50)
  if (seen.has(key)) bad.push(`${q.id} ו-${seen.get(key)}: פתיחה זהה`)
  seen.set(key, q.id)
}
const kinds = {}
for (const q of qs) kinds[q.type] = (kinds[q.type]||0)+1
console.log(`נבדקו ${qs.length} שאלות · ${JSON.stringify(kinds)}`)
console.log(`תקינות: ${qs.length - out.filter(o=>o.errs.length).length} מתוך ${qs.length}`)
if (bad.length) { console.log('\nממצאים:'); for (const b of bad) console.log('  · ' + b) }
else console.log('אין ממצאים מבניים')
const srcs = [...new Set(qs.map(q=>q.sources))].sort()
console.log(`\nמקורות שמופיעים: ${srcs.length} · ${srcs.slice(0,20).join(', ')}${srcs.length>20?'…':''}`)
const diff = {}
for (const q of qs) diff[q.difficulty ?? '?'] = (diff[q.difficulty ?? '?']||0)+1
console.log(`רמות קושי: ${JSON.stringify(diff)}`)
fs.writeFileSync('/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07/logs/exam-lint.log',
  `נבדקו ${qs.length}\n` + out.map(o=>`${o.id} · ${o.type} · ${o.src} · ${o.n} אפשרויות · ${o.right} נכונות · ${o.errs.length?o.errs.join(' · '):'תקין'}`).join('\n') + '\n')
