import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
s = s.replace('/** A plate: one painted view', fs.readFileSync('scratchpad/trench.txt', 'utf8') + '\n/** A plate: one painted view')
const I = ' '.repeat(16)
const from = `${I}<T r="§24.trench" className="ch4-body" reveal />`
if (!s.includes(from)) throw new Error('trench anchor missing')
s = s.replace(from, `${I}<Trench r="§24.trench" />`)
fs.writeFileSync(p, s)
console.log('Trench wired:', (s.match(/<Trench /g) || []).length)
