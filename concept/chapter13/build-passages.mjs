/* Builds web/src/lib/chapter13/passages.json from SOURCE-TEXT.md — not by hand.
   Every § is one card in the booklet, and the card's lines are parsed, never rewritten:

     title  — the first line. `name` is its bold part („דגל סעודיה"), `text` the whole line
              with the parenthesis („סמל הזרוע הצבאית של חמאס (גדודי עז אלדין אלקסאם)").
     label  — „מוטיבים:", when the card has it (§5 and §16 do not).
     items  — the list. A „- " line in the booklet, or (§16 only) a bare line.
              `b` = the bold runs of the item, exactly as the booklet sets them.
     quotes — what follows the list, split at each „(סורה N:N)". `ref` is that parenthesis.

   The [תמונה: …] notes are mine, not the source, and are dropped. verify-chapter13.mjs
   re-joins every card and compares it with its § character for character.
   Run: node concept/chapter13/build-passages.mjs */
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const head = src.match(/^## (פרק שלושה-עשר: .+)$/m)[1]
const body = src.slice(src.indexOf('## פרק שלושה-עשר'), src.indexOf('## הערות עריכה'))

const bolds = (s) => [...s.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]).filter((x) => x.trim() && x.trim() !== ',')
const plain = (s) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()

export function cardLines(raw) {
  /* drop the image notes: from a line opening with „[" to the line that closes it */
  const out = []
  let inNote = false
  for (const line of raw.split('\n')) {
    if (!inNote && line.startsWith('[')) inNote = true
    if (!inNote && line.trim()) out.push(line.trim())
    if (inNote && line.trimEnd().endsWith(']')) inNote = false
  }
  return out
}

const passages = {}
/* split, not a lazy regex: with the m flag `$` is every line end, and the card stopped after its title */
for (const chunk of body.replace(/\r/g, '').split(/^### /m).slice(1)) {
  const sec = chunk.match(/^§\d+/)[0]
  const raw = chunk.slice(sec.length).split('\n---')[0]
  const lines = cardLines(raw)
  const t = lines.shift()
  const card = { title: { text: plain(t), name: bolds(t)[0] } }
  if (lines[0] === 'מוטיבים:') card.label = lines.shift()
  const bullets = lines.filter((l) => l.startsWith('- '))
  let rest = lines.filter((l) => !l.startsWith('- '))
  let items = bullets.map((l) => l.slice(2))
  /* §16: five bare lines, no bullet, no bold — the booklet's translation of the flag */
  if (!bullets.length && rest.length && !rest.some((l) => l.includes('**'))) { items = rest; rest = [] }
  if (items.length) {
    card.items = items.map((l) => {
      const it = { text: plain(l) }
      const b = bolds(l).map((x) => x.trim())
      if (b.length) it.b = b
      return it
    })
  }
  const tail = rest.join(' ')
  if (tail) {
    card.quotes = []
    const re = /([\s\S]*?)(\(סורה \d+:\d+\))/g
    let last = 0, q
    while ((q = re.exec(tail))) {
      card.quotes.push({ text: plain(q[1]), b: bolds(q[1]).map((x) => x.trim()), ref: q[2] })
      last = re.lastIndex
    }
    if (tail.slice(last).trim()) card.quotes.push({ text: plain(tail.slice(last)), b: bolds(tail.slice(last)).map((x) => x.trim()) })
  }
  passages[sec] = card
}

const out = {
  $note:
    'כל מילה בפרק 13 חיה כאן, פעם אחת. נבנה מ-concept/chapter13/SOURCE-TEXT.md על ידי build-passages.mjs — לא לערוך ביד. כל § הוא כרטיס אחד בחוברת: title (name = החלק המודגש), label („מוטיבים:"), items (b = ההדגשות כפי שבחוברת), quotes (ref = „(סורה N:N)"). concept/chapter13/verify-chapter13.mjs מרכיב כל כרטיס מחדש ומשווה ל-§ אות באות.',
  number: 13,
  title: 'דגלים וסמלים',
  sourceTitle: head.replace(/^פרק שלושה-עשר: /, ''),
  passages,
}
await mkdir(new URL('../../web/src/lib/chapter13/', here), { recursive: true })
await writeFile(new URL('../../web/src/lib/chapter13/passages.json', here), JSON.stringify(out, null, 2) + '\n')
console.log(`passages.json · ${Object.keys(passages).length} כרטיסים`)
