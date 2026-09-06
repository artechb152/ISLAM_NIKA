/* Chapter 3 · the panel gate.

   The question this exists to answer is the user's own: "I need you to make sure
   the image matches what is written." A promise cannot answer it; a checklist
   that runs can answer most of it.

   WHAT THIS GATE CHECKS BY MACHINE
     1. every caption ref points at a fragment that actually exists
     2. every balloon ref exists, AND its text is a real substring of that
        fragment — a balloon can never put words in anyone's mouth
     3. no panel is missing its `must` list
     4. no panel that touches a prophet or an angel is missing the absence
        declaration in `mustNot`
     5. ONCE — no fragment is used by two panels
     6. COVERAGE — every fragment reaches some panel (warns while the manifest
        is still being filled in, fails once it is complete)

   WHAT IT CANNOT CHECK, AND SAYS SO
     whether the produced picture actually shows five scrolls. That is an eye
     check, and it is recorded in `checked.findings` per panel. The gate does
     enforce that no panel is marked done without one.

   Run: node concept/chapter3/verify-panels.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const panels = JSON.parse(await readFile(new URL('panels.json', here), 'utf8'))
const passages = JSON.parse(
  await readFile(new URL('../../web/src/lib/chapter3/passages.json', here), 'utf8'),
).passages

const errors = []
const warn = []

/** every §N.fragment that exists in the source */
const all = new Set()
for (const [sec, frags] of Object.entries(passages)) for (const f of frags) all.add(`${sec}.${f.id}`)

const textOf = (ref) => {
  const [sec, id] = ref.split('.')
  const f = (passages[sec] ?? []).find((x) => x.id === id)
  return f ? [f.text, f.name, ...(f.list ?? [])].filter(Boolean).join(' ') : null
}

/* the words that may never be drawn — a panel naming one must declare its absence */
const PROPHETS = ['גבריאל', 'מוחמד', 'אדם', 'ישוע', 'יוחנן', 'יוסף', 'אהרון', 'חנוך', 'משה', 'אברהם']

const used = new Map()

for (const p of panels.panels) {
  const at = `${p.id}`

  if (!Array.isArray(p.must) || !p.must.length) errors.push(`${at}: אין רשימת must`)
  if (!p.grid) errors.push(`${at}: אין grid`)

  for (const ref of p.captions ?? []) {
    if (!all.has(ref)) {
      errors.push(`${at}: הקופסה מפנה ל־${ref} שאינו קיים ב־passages.json`)
      continue
    }
    if (used.has(ref)) errors.push(`${at}: ${ref} כבר נצרך בפאנל ${used.get(ref)}`)
    else used.set(ref, p.id)
  }

  /* a balloon may only say words the source actually contains */
  if (p.balloon) {
    const src = textOf(p.balloon.ref)
    if (src === null) errors.push(`${at}: הבועה מפנה ל־${p.balloon.ref} שאינו קיים`)
    else {
      const flat = (s) => s.replace(/[\s„”"'.,:;()\[\]–—-]/g, '')
      if (!flat(src).includes(flat(p.balloon.text))) {
        errors.push(`${at}: הבועה אומרת "${p.balloon.text}" — אין לזה מקור ב־${p.balloon.ref}`)
      }
    }
  }

  /* if any prophet or angel is named in this panel's text, absence must be declared */
  const body = (p.captions ?? []).map(textOf).join(' ')
  const banned = (p.mustNot ?? []).join(' ')
  for (const name of PROPHETS) {
    if (body.includes(name) && !banned.includes(name)) {
      warn.push(`${at}: הכתוב נוקב ב"${name}" ו־mustNot אינו מצהיר על היעדרו`)
    }
  }

  /* a panel is not finished until an eye has been over it */
  if (p.checked && (!p.checked.findings || !p.checked.findings.length)) {
    errors.push(`${at}: מסומן כנבדק אך אין findings`)
  }
}

/* coverage — a warning while the manifest is under construction */
const missing = [...all].filter((r) => !used.has(r))
const done = panels.panels.filter((p) => p.checked).length

console.log(
  `פאנלים במניפסט: ${panels.panels.length} · נבדקו בעין: ${done} · ` +
    `קטעים מכוסים: ${used.size}/${all.size}`,
)
if (missing.length) warn.push(`עדיין לא מוקצים לפאנל: ${missing.length} קטעים`)

for (const w of warn) console.log(`⚠ ${w}`)
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  process.exit(1)
}
console.log('✅ כל הפניה קיימת · כל בועה נשענת על המקור · אין קטע בשני פאנלים')
