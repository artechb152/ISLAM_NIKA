/* שער התרגול של פרק 16 — כל תשובה וכל מסיח נשענים על המקור (השער של פרקים 11/13).

   לכל שאלה:
   - הסעיפים שב-`sources` קיימים; כל ביטוי שהלומדת בוחרת — אפשרות, צד של התאמה — אחרי הסרת
     פיסוק וניקוד, מופיע בגוף המקור (בין כותרת הפרק להערות העריכה), או מוצהר ב-PARAPHRASE
     עם הסיבה. ביטוי מוצהר הוא תמיד מסיח — לעולם לא תשובה נכונה.
   - single: בדיוק תשובה נכונה אחת; multi: לפחות אחת. לכל שאלת בחירה סעיף תשובה מוצהר
     (ANSWER): כל תשובה נכונה נמצאת בו, ואף מסיח אינו נאמר בו — לא רק „איפשהו בפרק".
   - match: אין שתי שורות עם אותה תשובה. אם צד אחד הוא הנושא של סעיף (בראשו — שם המועד
     שפותח כל פסקה ברשימת המועדים), הצד השני חייב להיות באותו סעיף. אחרת (מונח ופירושו) —
     התשובה היא הקרובה ביותר למונח מבין כל תשובות השאלה, עד 30 תווים בלי רווחים.
     כך החלפה של שתי תשובות נופלת (נבדק במוטציה). §12 („סביב לילה זה") ממשיך את §11.
   - הערות עריכה 4/5/10/11: לא 30 ולא 360 (החשבון של §5), לא מספר חודש שהמקור לא נתן (צפר,
     ג'ומאדא אלאולא, החודש העוקב), לא כימות של תחקורי המחבלים, ולא „70" בלי „כ-".
   - כיסוי: לכל מקטע של layout.json יש שאלה שנשענת על סעיף שלו.
   ריצה: node concept/chapter16/verify-practice.mjs */
import { readFile } from 'node:fs/promises'
const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const Q = JSON.parse(await readFile(new URL('../../web/src/lib/chapter16/practice.json', here), 'utf8')).questions
const layout = JSON.parse(await readFile(new URL('../../web/src/lib/chapter16/layout.json', here), 'utf8'))
const body = src.slice(src.indexOf('## פרק ששה עשר'), src.indexOf('## הערות עריכה'))
const flat = (s) => String(s).replace(/[֑-ׇ]/g, '').replace(/[\s„“”"'׳״*.,:;()\[\]–—\-?!]/g, '')
const F = flat(body)

const secText = Object.fromEntries([...body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---|$)/gm)].map(([, id, t]) => [id, t]))
const GROUP = { '§12': '§11' }
const textOf = (s) => flat((GROUP[s] ? secText[GROUP[s]] + ' ' : '') + (secText[s] ?? ''))
/* סעיף וכל מה שממשיך אותו */
const familyOf = (s) => flat([secText[s], ...Object.keys(GROUP).filter((k) => GROUP[k] === s).map((k) => secText[k])].join(' '))
/* הסעיף שבו נאמרת התשובה הנכונה של כל שאלת בחירה — כדי שמסיח מסעיף אחר שב-sources
   לא יעבור כתשובה, ושאף מסיח לא יהיה נכון גם הוא */
const ANSWER = { kinds: '§1', mawlid: '§8', tashriq: '§7', isra: '§11', kufa: '§18', shahid: '§19' }
const idxs = (T, p) => { const out = []; let i = T.indexOf(p); while (i >= 0) { out.push(i); i = T.indexOf(p, i + 1) } return out }

const PARAPHRASE = {
  'ימי ניצחון בקרבות': 'מסיח מוצהר — אינו במקור (§1 מונה את סוגי ימי הציון)',
  'ימי הכתרה של שליטים': 'מסיח מוצהר — אינו במקור',
  'המסורות חלוקות על יום הולדתו': 'מסיח; §17 — המסורות חלוקות על יום מותה של פאטמה. על יום ההולדת §8 נוקב תאריך אחד',
  'הוא חל בחודש רמדאן, שבו צמים': 'מסיח; §8 — מולד אלנבי חל ב-12 לחודש רביע אלאול',
}
const PF = new Set(Object.keys(PARAPHRASE).map(flat))
const phrasesOf = (q) => [...(q.options ?? []).map((o) => o.text), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right])]
const rightsOf = (q) => [...(q.options ?? []).filter((o) => o.right).map((o) => o.text), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right])]

const errors = []
if (Object.keys(secText).length !== 20) errors.push(`נקראו ${Object.keys(secText).length} סעיפים, לא 20`)
const secs = new Set(Object.keys(secText))
const seen = new Set()
for (const q of Q) {
  if (seen.has(q.id)) errors.push(`id כפול ${q.id}`); seen.add(q.id)
  const ss = q.sources.split(/\s+/)
  for (const s of ss) if (!secs.has(s)) errors.push(`${q.id}: ${s} אינו במקור`)
  for (const ph of phrasesOf(q)) if (!F.includes(flat(ph)) && !PF.has(flat(ph))) errors.push(`${q.id}: „${ph}" אינו במקור ואינו מוצהר כניסוח`)
  for (const r of rightsOf(q)) if (PF.has(flat(r))) errors.push(`${q.id}: ניסוח מוצהר „${r}" משמש כתשובה נכונה`)
  if (q.options && !q.options.some((o) => o.right)) errors.push(`${q.id}: אין תשובה נכונה`)
  if (q.type === 'single' && q.options.filter((o) => o.right).length !== 1) errors.push(`${q.id}: single בלי בדיוק תשובה נכונה אחת`)

  /* תשובה נכונה — בסעיף שבו היא נאמרת (ANSWER), ואף מסיח אינו נאמר באותו סעיף */
  if (q.options) {
    const at = ANSWER[q.id]
    if (!at) errors.push(`${q.id}: אין ל-${q.type} סעיף תשובה ב-ANSWER`)
    else {
      if (!ss.includes(at)) errors.push(`${q.id}: סעיף התשובה ${at} אינו ב-sources`)
      const T = flat(secText[at] ?? '')
      for (const o of q.options) {
        if (o.right && !T.includes(flat(o.text))) errors.push(`${q.id}: התשובה „${o.text}" אינה ב-${at}`)
        if (!o.right && T.includes(flat(o.text))) errors.push(`${q.id}: המסיח „${o.text}" נאמר גם הוא ב-${at}`)
      }
    }
  }

  /* match — אם צד אחד הוא נושא של סעיף (בראשו), הצד השני חייב להיות באותו סעיף;
     אחרת (מונח ופירושו) התשובה היא הקרובה ביותר לצד השמאלי מבין כל תשובות השאלה */
  if (q.type === 'match') {
    if (new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) errors.push(`${q.id}: שתי שורות עם אותה תשובה`)
    const cands = q.pairs.map((p) => flat(p.right))
    const heads = (P) => ss.filter((s) => !GROUP[s] && flat(secText[s] ?? '').slice(0, 40).includes(P))
    for (const p of q.pairs) {
      const L = flat(p.left), Rt = flat(p.right)
      const hL = heads(L), hR = heads(Rt)
      let ok
      if (hL.length || hR.length) {
        const subj = hL.length ? hL : hR, other = hL.length ? Rt : L
        ok = subj.some((s) => familyOf(s).includes(other))
      } else {
        ok = ss.some((s) => {
          const T = textOf(s)
          return idxs(T, L).some((i) => {
            let best = null, bd = Infinity
            for (const c of cands) for (const j of idxs(T, c)) { const d = Math.abs(i - j); if (d < bd) { bd = d; best = c } }
            return best === Rt && bd <= 30 + L.length
          })
        })
      }
      if (!ok) errors.push(`${q.id}: „${p.left}" ↔ „${p.right}" — הסעיף שנושא את הצד האחד אינו קושר אותו לצד השני`)
    }
  }

  /* הערות עריכה */
  const { $note, ...fields } = q
  const all = JSON.stringify(fields)
  if (/(^|[^\d])(30|360)([^\d]|$)/.test(all)) errors.push(`${q.id}: 30/360 — החשבון של §5 אינו במקור`)
  if (/(צפר|אלאולא|העוקב)\s*\(\d+\)/.test(all)) errors.push(`${q.id}: מספר חודש שהמקור לא נתן`)
  if (/(רוב|מרבית|כל|\d+)\s*(ה)?(מחבלים|תחקורים)/.test(all) || /%/.test(all)) errors.push(`${q.id}: כימות של תחקורי המחבלים`)
  if (/(^|[^-\dכ])70/.test(all.replace(/כ-70/g, ''))) errors.push(`${q.id}: „70" בלי „כ-"`)
}

/* כיסוי — כל מקטע */
for (const s of layout.sections) {
  const ids = new Set(JSON.stringify(s).match(/§\d+/g) ?? [])
  if (!Q.some((q) => q.sources.split(/\s+/).some((x) => ids.has(x)))) errors.push(`מקטע „${s.title}" בלי שאלה`)
}
const used = Object.keys(PARAPHRASE).filter((k) => Q.some((q) => phrasesOf(q).some((ph) => flat(ph) === flat(k))))
if (used.length !== Object.keys(PARAPHRASE).length) errors.push('ניסוח מוצהר שאף שאלה לא משתמשת בו')
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
const covered = [...new Set(Q.flatMap((q) => q.sources.split(/\s+/)))].sort((a, b) => +a.slice(1) - +b.slice(1))
console.log(`✅ ${Q.length} שאלות · ${layout.sections.length}/${layout.sections.length} מקטעים · ${covered.join(' ')} · כל תשובה נכונה בסעיף שלה (${used.length} מסיחים מוצהרים)`)
