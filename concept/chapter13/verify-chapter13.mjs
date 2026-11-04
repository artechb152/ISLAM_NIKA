/* Chapter 13 fidelity gate. Machine-checked:

   1. FIDELITY  — every string in passages.json is in SOURCE-TEXT.md, verbatim.
   2. WHOLE     — each card, re-joined (title · label · items · quotes · refs), IS its §,
                  character for character (whitespace and the booklet's ** aside). A word
                  dropped by the parser fails here.
   3. BOLD      — every `b` run is a substring of its own line; `name` opens the title.
   4. COVERAGE  — all 16 §; no card without a station.
   5. ONCE      — layout.json has one station per §, exactly once, in source order.
   6. KIND      — 'flag' iff the card's title opens with „דגל", 'emblem' iff „סמל": the
                  hall's flag/emblem distinction is the booklet's, and stays so.
   7. ASSETS    — each station's texture exists.

   Run: node concept/chapter13/verify-chapter13.mjs */
import { readFile, access } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = (await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')).replace(/\r/g, '')
const data = JSON.parse(await readFile(new URL('../../web/src/lib/chapter13/passages.json', here), 'utf8'))
const layout = JSON.parse(await readFile(new URL('../../web/src/lib/chapter13/layout.json', here), 'utf8'))
const errors = []

const flat = (s) => s.replace(/\*\*/g, '').replace(/[\s„”"'.,:;()\[\]–—\-]/g, '')
const ws = (s) => s.replace(/\*\*/g, '').replace(/\s+/g, '')
const body = src.slice(src.indexOf('## פרק שלושה-עשר'), src.indexOf('## הערות עריכה'))
const flatSrc = flat(body)

/* the § as the booklet prints it: image notes (mine) and list bullets dropped */
const srcCards = {}
for (const chunk of body.split(/^### /m).slice(1)) {
  const sec = chunk.match(/^§\d+/)[0]
  const lines = []
  let inNote = false
  for (const line of chunk.slice(sec.length).split('\n---')[0].split('\n')) {
    if (!inNote && line.startsWith('[')) inNote = true
    if (!inNote && line.trim()) lines.push(line.trim().replace(/^- /, ''))
    if (inNote && line.trimEnd().endsWith(']')) inNote = false
  }
  srcCards[sec] = lines.join(' ')
}

for (const [sec, c] of Object.entries(data.passages)) {
  if (!srcCards[sec]) { errors.push(`כרטיס שלא קיים במקור: ${sec}`); continue }
  const strings = [c.title?.text, c.label, ...(c.items ?? []).map((i) => i.text), ...(c.quotes ?? []).flatMap((q) => [q.text, q.ref])].filter(Boolean)
  for (const s of strings) if (!flatSrc.includes(flat(s))) errors.push(`${sec}: טקסט שאינו במקור — "${s.slice(0, 50)}"`)
  if (ws(strings.join(' ')) !== ws(srcCards[sec])) errors.push(`${sec}: הכרטיס אינו מרכיב את ה-§ בשלמותו`)
  if (!c.title?.name || !c.title.text.startsWith(c.title.name)) errors.push(`${sec}: name אינו פתיחת הכותרת`)
  for (const line of [...(c.items ?? []), ...(c.quotes ?? [])]) {
    for (const b of line.b ?? []) if (!line.text.includes(b)) errors.push(`${sec}: הדגשה שאינה בשורה — "${b}"`)
  }
}
for (const sec of Object.keys(srcCards)) if (!data.passages[sec]) errors.push(`§ שאין לו כרטיס: ${sec}`)

const order = Object.keys(srcCards)
const seq = layout.stations.map((s) => s.sec)
if (seq.join() !== order.join()) errors.push(`התחנות אינן המקור בסדרו: ${seq.join(' ')}`)
for (const st of layout.stations) {
  const name = data.passages[st.sec]?.title?.name ?? ''
  const want = name.startsWith('דגל') ? 'flag' : name.startsWith('סמל') ? 'emblem' : '?'
  if (st.kind !== want) errors.push(`${st.sec}: kind=${st.kind} אבל הכותרת „${name}"`)
  try { await access(new URL(`../../web/public/assets/chapter13/flags/${st.tex}`, here)) }
  catch { errors.push(`${st.sec}: טקסטורה חסרה — ${st.tex}`) }
}

const cards = Object.values(data.passages)
const nItems = cards.reduce((n, c) => n + (c.items?.length ?? 0), 0)
const nQuotes = cards.reduce((n, c) => n + (c.quotes?.length ?? 0), 0)
console.log(`כרטיסים: ${cards.length} · שורות: ${nItems} · ציטוטים: ${nQuotes} · תחנות: ${layout.stations.length}`)
if (errors.length) {
  console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n'))
  process.exit(1)
}
console.log('✅ נאמנות מלאה · כל כרטיס מרכיב את ה-§ שלו אות באות · תחנה אחת לכל §, בסדר המקור · דגל/סמל לפי הכותרת')
