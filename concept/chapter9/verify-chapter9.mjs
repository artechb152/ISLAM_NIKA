/* Chapter 9 fidelity gate. Three invariants, all machine-checked:

   1. FIDELITY  — every fragment in passages.json appears verbatim in SOURCE-TEXT.md.
                  Nothing in the chapter may be a sentence I wrote.
   2. COVERAGE  — every §N in SOURCE-TEXT.md has at least one fragment.  0 orphans.
   3. ONCE      — the layout consumes every fragment EXACTLY once: nothing dropped,
                  nothing printed twice. This is the invariant that used to be a
                  promise; here it fails the build instead.

   Run: node concept/chapter9/verify-chapter9.mjs
*/
import { readFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const data = JSON.parse(await readFile(new URL('../../web/src/lib/chapter9/passages.json', here), 'utf8'))

let layout = null
try {
  layout = JSON.parse(await readFile(new URL('../../web/src/lib/chapter9/layout.json', here), 'utf8'))
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
const omitted = []

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
    /* An `em` phrase is a span the page sets in maroon inside its own sentence. It
       changes no words, but it is still a claim about the text — that this run of
       characters is there — so it is checked like everything else, against the
       fragment it belongs to rather than against the whole source. A phrase that
       drifted by one character would silently stop highlighting and nobody would
       see it; here it fails the build. */
    /* `em` is a maroon emphasis, `tr` a gold transliteration. Both are spans the page
       sets inside its own sentence, both change no words, and both are still claims
       about the text — that this run of characters is there — so both are checked
       against the fragment they belong to. A phrase that drifted by one character would
       silently stop highlighting and nobody would see it; here it fails the build. */
    for (const [field, label] of [['em', 'הדגשה'], ['tr', 'תעתיק'], ['q', 'ציטוט נטוי']]) {
      const list = f[field]
      if (!list) continue
      if (!Array.isArray(list) || !list.length) errors.push(`${sec}.${f.id}: ${field} ריק`)
      for (const phrase of list) {
        if (!f.text || !f.text.includes(phrase)) {
          errors.push(`${sec}.${f.id}: ${label} שאינו במשפט — "${phrase}"`)
        }
      }
    }
    /* the two must not overlap: a phrase in both would be painted twice, and the second
       pass would cut the first one's element in half */
    for (const phrase of f.tr ?? []) {
      if ((f.em ?? []).includes(phrase)) errors.push(`${sec}.${f.id}: "${phrase}" גם הדגשה וגם תעתיק`)
    }
    if (f.page) {
      if (!f.text) errors.push(`${sec}.${f.id}: ניסוח חלופי בלי משפט מקור לצידו`)
      reworded.push(`${sec}.${f.id}`)
    }
    /* a fragment the user asked to leave off the page. It stays here, and stays
       checked against the source — it is simply not printed, and the layout is
       not required to consume it. Reported every run for the same reason the
       rewordings are: an omission that nobody can see is an omission nobody
       remembers making. */
    if (f.omitted) {
      if (f.page) errors.push(`${sec}.${f.id}: גם מוסר וגם מנוסח מחדש`)
      omitted.push(`${sec}.${f.id}`)
    }
    allFragments.push(`${sec}.${f.id}`)
  }
}

/* ---------- 1b · whole: the fragments of a § rebuild it, character for character ----------
   chapter 9's passages are CUT from the § by build-passages.py, so the cut must be
   lossless: joined with a space they equal the § (whitespace aside). A word that fell
   between two fragments would otherwise vanish without any gate noticing. */
const body = src.slice(src.indexOf('## פרק תשיעי'), src.indexOf('## מפת הפרק'))
const srcSecs = Object.fromEntries([...body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |$)/gm)].map((m) => [m[1], m[2].trim()]))
const ws = (s) => s.replace(/\s+/g, '')
for (const [sec, frags] of Object.entries(data.passages)) {
  const joined = frags.map((f) => f.text ?? '').join(' ')
  if (srcSecs[sec] && ws(joined) !== ws(srcSecs[sec])) errors.push(`${sec}: הקטעים אינם מרכיבים את הסעיף בשלמותו`)
}

/* ---------- 1c · the Karbala film's subtitles ARE the four fragments ----------
   build-karbala-cues.mjs cuts layout.json karbala.sequence into subtitle lines; joined,
   the lines must equal those fragments joined. A hand-edited subtitle fails here. */
try {
  const cues = JSON.parse(await readFile(new URL('../../web/src/lib/chapter9/karbala-cues.json', here), 'utf8'))
  const seq = layout?.sections.find((x) => x.id === 'karbala')?.slots.sequence ?? []
  const want = seq.flat().map((r) => { const [sec, id] = r.split('.'); return data.passages[sec]?.find((f) => f.id === id)?.text ?? '' }).join(' ')
  if (ws(cues.map((c) => c[2]).join(' ')) !== ws(want)) errors.push('כתוביות סרטון כרבלאא\' אינן ארבעת הקטעים מילה במילה — להריץ build-karbala-cues.mjs')
  for (let i = 1; i < cues.length; i++) if (cues[i][0] < cues[i - 1][1]) errors.push(`כתוביות חופפות בזמן: ${i}`)
} catch (e) { errors.push('karbala-cues.json חסר: ' + e.message) }

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
    /* a device label {from, cut} QUOTES a fragment, it does not print it: its `from`
       is not a consumption. Each cut is checked below instead. */
    if (node && typeof node === 'object') {
      if (typeof node.from === 'string' && Array.isArray(node.cut)) return labels.push(node)
      return Object.values(node).forEach(walk)
    }
  }
  const labels = []
  walk(layout)

  /* every device label is cut out of its fragment's own sentence (rule 27) */
  const fragText = (ref) => {
    const [sec, id] = ref.split('.')
    return (data.passages[sec] ?? []).find((f) => f.id === id)?.text
  }
  for (const { from, cut } of labels) {
    const t = fragText(from)
    if (!t) { errors.push(`תווית מפנה לקטע שלא קיים: ${from}`); continue }
    for (const c of cut) if (!t.includes(c)) errors.push(`תווית שאינה חתוכה מהמשפט שלה: ${from} — "${c}"`)
  }
  /* a gap on a time axis carries its own number — the data says 130, the label must too */
  for (const sec of layout.sections) for (const g of sec.siraAxis?.gaps ?? []) {
    if (!g.label.cut.some((c) => c.includes(String(g.years)))) errors.push(`פער ${g.years} שתוויתו אינה נושאת את המספר`)
  }

  for (const ref of allFragments) {
    const n = used.get(ref) ?? 0
    if (n === 0 && !omitted.includes(ref)) errors.push(`קטע שלא מופיע בפרק: ${ref}`)
    if (n > 0 && omitted.includes(ref)) errors.push(`קטע מסומן כמוסר אך הפריסה צורכת אותו: ${ref}`)
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
if (omitted.length) {
  console.log(`⚠ קטעים שהוסרו מהעמוד באישור המשתמשת: ${omitted.join(', ')}`)
}
if (reworded.length) {
  console.log(`⚠ ניסוחים מאושרים על ידי המשתמשת (מודפסים במקום משפט המקור): ${reworded.join(', ')}`)
}
const qCount = Object.values(data.passages).flat().reduce((n, f) => n + (f.q?.length ?? 0), 0)
const emCount = Object.values(data.passages).flat().reduce((n, f) => n + (f.em?.length ?? 0), 0)
const trCount = Object.values(data.passages).flat().reduce((n, f) => n + (f.tr?.length ?? 0), 0)
console.log(
  `✅ נאמנות מלאה · ${external.length} סעיפים · ${emCount} הדגשות, ${trCount} תעתיקים ו-${qCount} ציטוט נטוי מאומתים · ` +
    `${reworded.length ? `${reworded.length} ניסוחים מאושרים, כל השאר מהמקור` : 'אפס משפטים מומצאים'}` +
    `${layout ? ' · כל קטע פעם אחת בדיוק' : ''}`,
)
