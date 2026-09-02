import fs from 'node:fs'
const d = JSON.parse(fs.readFileSync('src/lib/chapter4/passages.json', 'utf8'))
const L = JSON.parse(fs.readFileSync('src/lib/chapter4/layout.json', 'utf8'))
const t = (ref) => {
  const [s, i] = ref.split('.')
  const f = d.passages[s].find((x) => x.id === i)
  return f.list ? f.list.join(' ') : f.text
}
const badr = L.sections.find((s) => s.id === 'badr')
const refs = Object.values(badr.slots).flat()
const script = refs.map(t).join(' ')
fs.writeFileSync('scratchpad/narr-badr.txt', script, 'utf8')
console.log('קטעים:', refs.length)
console.log('מילים:', script.split(/\s+/).length)
console.log('תווים:', script.length)
/* לפי המדידה הקודמת: 68 מילים = 33.6 שניות */
console.log('אורך משוער:', Math.round((script.split(/\s+/).length / 68) * 33.6), 'שניות')
console.log('סדר:', refs.join(' · '))
