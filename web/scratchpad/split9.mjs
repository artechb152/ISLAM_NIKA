import fs from 'node:fs'

const pp = 'src/lib/chapter4/passages.json'
const d = JSON.parse(fs.readFileSync(pp, 'utf8'))
const full = d.passages['§9'].find((f) => f.id === 'a').text
const seam = 'למצב של ג׳האד'.replace('׳', "'")
const i = full.indexOf(seam)
if (i < 0) throw new Error('seam not found in §9.a')
d.passages['§9'] = [
  { id: 'dawa', term: 'דעוה', text: full.slice(0, i).trim() },
  { id: 'jihad', term: "ג'האד", text: full.slice(i).trim() },
  ...d.passages['§9'].filter((f) => f.id !== 'a'),
]
fs.writeFileSync(pp, JSON.stringify(d, null, 2) + '\n')

const lp = 'src/lib/chapter4/layout.json'
const L = JSON.parse(fs.readFileSync(lp, 'utf8'))
const s = L.sections.find((x) => x.id === 'jihad')
s.slots = { pair: ['§9.dawa', '§9.jihad'], consequence: ['§9.b', '§9.c'] }
fs.writeFileSync(lp, JSON.stringify(L, null, 2) + '\n')

console.log('§9.dawa :', d.passages['§9'][0].text)
console.log('§9.jihad:', d.passages['§9'][1].text.slice(0, 64) + '…')
