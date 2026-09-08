/* היכן נוחתת התשובה הנכונה אחרי הסידור — בכל ששת המאגרים. */
import fs from 'node:fs'
const dir='/Users/nikagreenbaum/ISLAM_NIKA/web/src/lib/exams/banks/'
const orderBank = (id, answers) => {
  const key = (t) => { let h=0; const s=id+'|'+t
    for (let i=0;i<s.length;i++) h=(Math.imul(h,31)+s.charCodeAt(i))|0
    return h }
  return [...answers].sort((a,b)=>key(a)-key(b))
}
let all=0, firstBefore=0, firstAfter=0
const spread = {}
for (const f of fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort()) {
  const b = JSON.parse(fs.readFileSync(dir+f,'utf8'))
  const qs = b.questions || b
  let n=0, fb=0, fa=0
  for (const q of qs) {
    if (q.type !== 'single') continue
    n++; all++
    const texts = q.options.map(o=>o.text)
    const rightText = q.options.find(o=>o.right).text
    if (texts[0] === rightText) { fb++; firstBefore++ }
    const after = orderBank(q.id, texts)
    const pos = after.indexOf(rightText)
    spread[pos] = (spread[pos]||0)+1
    if (pos === 0) { fa++; firstAfter++ }
  }
  console.log(`${f.padEnd(9)} single=${String(n).padStart(3)} · הנכונה ראשונה לפני=${String(fb).padStart(3)} · אחרי=${String(fa).padStart(3)}`)
}
console.log(`\nסך הכול: ${all} שאלות בחירה · לפני: ${firstBefore} ראשונות (${Math.round(100*firstBefore/all)}%) · אחרי: ${firstAfter} (${Math.round(100*firstAfter/all)}%)`)
console.log('פיזור המיקום אחרי הסידור:', JSON.stringify(spread))
