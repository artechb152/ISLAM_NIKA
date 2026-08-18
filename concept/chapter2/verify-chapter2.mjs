/* Chapter 2 fidelity gate. Three invariants, all machine-checked:

   1. FIDELITY  — every fragment in passages.json appears verbatim in SOURCE-TEXT.md.
                  Nothing in the chapter may be a sentence I wrote.
   2. COVERAGE  — every §N in SOURCE-TEXT.md has at least one fragment.  0 orphans.
   3. ONCE      — the layout consumes every fragment EXACTLY once: nothing dropped,
                  nothing printed twice. This is the invariant that used to be a
                  promise; here it fails the build instead.

   Run: node concept/chapter2/verify-chapter2.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const data = JSON.parse(await readFile(new URL('../../web/src/lib/chapter2/passages.json', here), 'utf8'))

let layout = null
try {
  layout = JSON.parse(await readFile(new URL('../../web/src/lib/chapter2/layout.json', here), 'utf8'))
} catch {
  /* the layout is authored after the passages — checked once it exists */
}

const errors = []
const warn = []
/* Sentences the user asked to be printed in different words from the source.
   They are collected and PRINTED, never merely tolerated: the whole worth of
   this gate is that "no invented sentences" is a fact and not a slogan, so a
   sanctioned departure has to be visible every single run. */
const reworded = []

/* ---------- 1 · fidelity ---------- */
/* compare with punctuation and quote glyphs stripped: the layout is allowed to
   set a sentence in a heading or a caption, never to change its words */
const flat = (s) => s.replace(/[\s„”"'.,:;()\[\]–—\-]/g, '')
const flatSrc = flat(src)

const sections = new Set([...src.matchAll(/^#{3} (§\d+)/gm)].map((m) => m[1]))
const allFragments = []

for (const [sec, frags] of Object.entries(data.passages)) {
  if (!sections.has(sec)) errors.push(`סעיף שלא קיים ב־SOURCE-TEXT: ${sec}`)
  if (!Array.isArray(frags) || !frags.length) {
    errors.push(`${sec}: אין קטעים`)
    continue
  }
  const ids = new Set()
  for (const f of frags) {
    if (!f.id) errors.push(`${sec}: קטע בלי id`)
    if (ids.has(f.id)) errors.push(`${sec}: id כפול "${f.id}"`)
    ids.add(f.id)

    /* `page` is deliberately NOT in this list: it is the approved rewording and
       by definition is not in the source. `text` still is, and still must be —
       so the source sentence stays on record and stays checked. */
    const strings = [f.text, f.name, ...(f.list ?? [])].filter((s) => typeof s === 'string' && s.trim())
    if (!strings.length) errors.push(`${sec}.${f.id}: קטע ריק`)
    for (const s of strings) {
      if (!flatSrc.includes(flat(s))) {
        errors.push(`${sec}.${f.id}: טקסט שאינו במקור — "${s.slice(0, 56)}…"`)
      }
    }
    if (f.page) {
      if (!f.text) errors.push(`${sec}.${f.id}: ניסוח חלופי בלי משפט מקור לצידו`)
      reworded.push(`${sec}.${f.id}`)
    }
    allFragments.push(`${sec}.${f.id}`)
  }
}

/* ---------- 2 · coverage ---------- */
for (const sec of sections) {
  if (!data.passages[sec]) errors.push(`סעיף שאיש לא אומר: ${sec}`)
}

/* ---------- 3 · exactly once ---------- */
if (layout) {
  const used = new Map()
  const walk = (node) => {
    if (typeof node === 'string') {
      if (/^§\d+\.[\w-]+$/.test(node)) used.set(node, (used.get(node) ?? 0) + 1)
      return
    }
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') return Object.values(node).forEach(walk)
  }
  walk(layout)

  for (const ref of allFragments) {
    const n = used.get(ref) ?? 0
    if (n === 0) errors.push(`קטע שלא מופיע בפרק: ${ref}`)
    if (n > 1) errors.push(`קטע שמופיע ${n} פעמים: ${ref}`)
  }
  for (const ref of used.keys()) {
    if (!allFragments.includes(ref)) errors.push(`הפריסה מפנה לקטע שלא קיים: ${ref}`)
  }
  const ids = layout.sections?.map((s) => s.id) ?? []
  if (new Set(ids).size !== ids.length) errors.push('מזהי מקטעים כפולים בפריסה')
} else {
  warn.push('layout.json עדיין לא קיים — בדיקת „פעם אחת בלבד“ תרוץ כשייווצר')
}

const external = [...src.matchAll(/^#{3} (§\d+)/gm)].map((m) => m[1])
console.log(
  `סעיפי מקור: ${sections.size} · קטעים: ${allFragments.length} · ` +
    `מקטעים בפריסה: ${layout ? layout.sections.length : '—'}`,
)
for (const w of warn) console.log('⚠ ' + w)
if (errors.length) {
  console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n'))
  process.exit(1)
}
if (reworded.length) {
  console.log(`⚠ ניסוחים מאושרים על ידי המשתמשת (מודפסים במקום משפט המקור): ${reworded.join(', ')}`)
}
console.log(
  `✅ נאמנות מלאה · ${external.length} סעיפים · ` +
    `${reworded.length ? `${reworded.length} ניסוחים מאושרים, כל השאר מהמקור` : 'אפס משפטים מומצאים'}` +
    `${layout ? ' · כל קטע פעם אחת בדיוק' : ''}`,
)
