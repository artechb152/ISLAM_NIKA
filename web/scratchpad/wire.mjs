import fs from 'node:fs'

const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
const mechs = fs.readFileSync(
  'C:/Users/nikag/AppData/Local/Temp/claude/C--Users-nikag/5cd0d07c-632c-4702-92a7-f96519799ba6/scratchpad/mechs.txt',
  'utf8',
)

/* `pick` was dropped when the chapter had no device that lifts a word out of a
   sentence. The term pair does, so it comes back — with its guard intact. */
const PICK = `/** A word LIFTED OUT of a fragment for a label, proved to be in it. A legend
    that names a thing has to be able to name it, but the name must still be the
    source's word and not a caption we compose. Throws if the word is not in the
    fragment at a word boundary, so a label cannot drift from its sentence. */
const EDGE = /[\\s,.;:—"'„”()[\\]–-]/
const pick = (ref: string, phrase: string): string => {
  const t = text(ref)
  const at = t.indexOf(phrase)
  const before = at > 0 ? t[at - 1] : ' '
  const after = at + phrase.length < t.length ? t[at + phrase.length] : ' '
  if (at < 0 || !EDGE.test(before) || !EDGE.test(after)) {
    throw new Error(\`chapter 4: "\${phrase}" is not a word of \${ref}\`)
  }
  return phrase
}

`
s = s.replace('/* ---------------- structure ---------------- */', PICK + '/* ---------------- structure ---------------- */')
s = s.replace('/** A plate: one painted view', mechs + '\n/** A plate: one painted view')

const swap = (from, to) => {
  if (!s.includes(from)) throw new Error('anchor missing: ' + from.trim().slice(0, 60))
  s = s.replace(from, to)
}
const I = ' '.repeat(16)

/* 02-C — the hinge as two terms facing each other */
swap(
  `${I}<Statement r="§9.a" />`,
  `${I}<Pair a="§9.dawa" b="§9.jihad" terms={['דעוה', "ג'האד"]} />`,
)

/* 03-A — the film carries §12 out of the prose */
swap(
  `${I}<Plate src="badr-night" />\n${I}<T r="§12.rain" className="ch4-body" reveal />\n${I}<T r="§12.duel" className="ch4-body" reveal />`,
  `${I}<Film src="badr-film">\n${I}  <T r="§12.rain" className="ch4-body" />\n${I}  <T r="§12.duel" className="ch4-body" />\n${I}</Film>`,
)

/* 04-B — the three things Uhud left */
swap(
  `${I}<T r="§19.a" className="ch4-body" reveal />\n${I}<T r="§19.b" className="ch4-body" reveal />\n${I}<T r="§19.c" className="ch4-body" reveal />`,
  `${I}<Outcomes refs={['§19.a', '§19.b', '§19.c']} />`,
)

/* 07-D — Ali, the four roles and the poisoned goat */
swap(
  `${I}<T r="§46.a" className="ch4-body" reveal />\n${I}<T r="§46.b" className="ch4-body" reveal />\n${I}<T r="§46.c" className="ch4-body" reveal />`,
  `${I}<Figure refs={['§46.a', '§46.b', '§46.c']} />`,
)

/* 10-D — the three agreements as dated marks */
swap(`${I}<T r="§32.list" className="ch4-body" reveal />`, `${I}<Treaties r="§32.list" />`)

fs.writeFileSync(p, s)
console.log('wired:', ['Pair', 'Film', 'Outcomes', 'Figure', 'Treaties'].map((n) => n + '=' + (s.match(new RegExp('<' + n + '[ />]', 'g')) || []).length).join(' · '))
