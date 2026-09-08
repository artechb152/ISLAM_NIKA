/* בדיקה ידנית של שתי שאלות ה-multi וארבע שאלות התוכן ששונו:
   האם המסיח נדחה, האם התשובה הנכונה מתקבלת, ומה המשוב אומר. */
import fs from 'node:fs'
const bank = JSON.parse(fs.readFileSync('/Users/nikagreenbaum/ISLAM_NIKA/web/src/lib/exams/banks/ch1.json','utf8'))
const QS = bank.questions
const isRight = (q, picked) => {
  const rights = q.options.filter(o=>o.right).map(o=>o.text).sort()
  return JSON.stringify([...picked].sort()) === JSON.stringify(rights)
}
const lines=[]; const say=m=>{console.log(m); lines.push(m)}
for (const id of ['ch1-q22','ch1-q65']) {
  const q = QS.find(x=>x.id===id)
  const rights = q.options.filter(o=>o.right).map(o=>o.text)
  const wrongs = q.options.filter(o=>!o.right).map(o=>o.text)
  say(`\n══ ${id} · ${q.sources} · ${q.prompt}`)
  for (const o of q.options) say(`   ${o.right?'✔':'✗'} ${o.text}`)
  say(`   סימון הכול → ${isRight(q, q.options.map(o=>o.text)) ? '✗ מתקבל' : '✔ נדחה'}`)
  say(`   סימון הנכונות בלבד → ${isRight(q, rights) ? '✔ מתקבל' : '✗ נדחה'}`)
  say(`   מסיחים: ${wrongs.length} · ${JSON.stringify(wrongs)}`)
  say(`   משוב: ${q.ok}`)
}
for (const id of ['ch1-q15','ch1-q33','ch1-q44','ch1-q45','ch1-q47']) {
  const q = QS.find(x=>x.id===id)
  say(`\n══ ${id} · ${q.type} · ${q.sources}`)
  say(`   ${q.prompt}`)
  if (q.options) for (const o of q.options) say(`   ${o.right?'✔':'✗'} ${o.text}`)
  if (q.points) q.points.forEach((p,i)=>say(`   נקודה ${i+1}: ${p}`))
  say(`   משוב: ${(q.ok||'').slice(0,180)}`)
}
const txt = JSON.stringify(bank)
say(`\nחומר רגיש בבנק: ${/צה"ל|חמאס|צוק איתן|2014|אלצ׳יף|אלצ'יף/.test(txt) ? '✗ נמצא' : '✔ אין'}`)
say(`„מערת חראא׳": ${/חראא/.test(txt) ? '✗ עדיין' : '✔ הוסר'}`)
say(`§31: ${QS.some(q=>/§31/.test(q.sources)) ? '✗ עדיין בשימוש' : '✔ אינו בשימוש'}`)
fs.writeFileSync('/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07/logs/multi-check.log', lines.join('\n')+'\n')
