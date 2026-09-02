const LAT_MIN = 21.3, LAT_MAX = 25.82
const P = [['מכה', 21.4225], ['חודיביה', 21.45], ['בדר', 23.78], ['מדינה', 24.4686], ["ח'יבר", 25.698]]
const py = (lat) => (LAT_MAX - lat) / (LAT_MAX - LAT_MIN)
const strip = 560, gap = 34
const s = P.map(([n, la]) => ({ n, y: py(la) })).sort((a, b) => a.y - b.y)
let last = -1e9
for (const p of s) {
  const want = p.y * strip
  const got = Math.max(want, last + gap)
  last = got
  console.log(p.n.padEnd(9), 'נקודה', want.toFixed(0).padStart(4) + 'px', '· תווית', got.toFixed(0).padStart(4) + 'px', got - want > 1 ? '← הוזזה ' + (got - want).toFixed(0) + 'px' : '')
}
