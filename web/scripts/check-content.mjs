/* ── שער התוכן של פרק 1 ──────────────────────────────────────────────────
 *
 * verify-dialogue בודק את dialogue.json מול SOURCE-TEXT, וזה כל מה שהיה.
 * כל השאר — משימות, עדויות, תוויות של דליים, שאלות התרגול — לא נבדק על
 * ידי איש, והתוצאה נמדדה: „מכס" ו„דרהם" ו„דרך הבשמים" הוצגו כעובדה
 * בארבעה מקומות ואף פעם אחת הם אינם בחוברת; שאלת תרגול תיקנה לומד
 * בעזרת תחנה שבוטלה שנה קודם; מזהה עדות שנמחקה נשאר בקוד ולא הפיל דבר.
 *
 * מה שנבדק כאן:
 *   1. כל §N בקבצי הנתונים קיים ב-SOURCE-TEXT.
 *   2. כל needsFind / needsFinds מצביע על עדות קיימת, באותו אזור.
 *   3. כל unlockedBy בלוח החוליות הוא מפגש או משימה קיימים.
 *   4. משימה אחת לכל אזור, ולכל דלי/צעד יש עוגן.
 *   5. רשימה שחורה: מונחים שאינם בחוברת ואסור שיחזרו למחרוזת לומד.
 *
 * הרצה: node scripts/check-content.mjs   (חלק מ-npm run verify)
 */
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const src = await readFile(new URL('../concept/chapter1/SOURCE-TEXT.md', root), 'utf8')
const SECTIONS = new Set([...src.matchAll(/^#{2,3} (§\d+)/gm)].map((m) => m[1]))

const { TASKS } = await import(new URL('src/lib/chapter1/tasks.ts', root).href)
const { FINDS } = await import(new URL('src/lib/chapter1/finds.ts', root).href)
const { LINKS, CHAPTER_QUESTION } = await import(new URL('src/lib/chapter1/links.ts', root).href)
const dlg = JSON.parse(await readFile(new URL('src/lib/chapter1/dialogue.json', root), 'utf8'))
const practice = JSON.parse(await readFile(new URL('src/lib/chapter1/practice.json', root), 'utf8'))

const errors = []
const ok = (cond, msg) => { if (!cond) errors.push(msg) }
const sect = (s, where) => ok(typeof s === 'string' && SECTIONS.has(s), `מקור לא תקין ${JSON.stringify(s)} ב־${where}`)

const findIds = new Map(FINDS.map((f) => [f.id, f]))
const taskIds = new Set(TASKS.map((t) => t.id))
const encounterIds = new Set(dlg.regions.flatMap((r) => r.encounters.map((e) => e.id)))
const regionIds = new Set(dlg.regions.map((r) => r.id))

/* 1+2+4 — המשימות */
const byRegion = new Map()
for (const t of TASKS) {
  sect(t.source, `task ${t.id}`)
  ok(regionIds.has(t.region), `משימה ${t.id} באזור שאינו קיים: ${t.region}`)
  ok(!byRegion.has(t.region), `שתי משימות באזור ${t.region} — המנוע מחזיק אחת`)
  byRegion.set(t.region, t.id)
  for (const f of t.needsFinds ?? []) {
    const find = findIds.get(f)
    ok(!!find, `משימה ${t.id} דורשת עדות שאינה קיימת: ${f}`)
    if (find) ok(find.region === t.region, `עדות ${f} יושבת ב-${find.region} אך נדרשת ב-${t.id}`)
  }
  for (const o of t.options ?? []) {
    if (o.needsFind) {
      const find = findIds.get(o.needsFind)
      ok(!!find, `אופציה ${o.id} ב-${t.id} דורשת עדות שאינה קיימת: ${o.needsFind}`)
      if (find) ok(find.region === t.region, `עדות ${o.needsFind} אינה באזור של ${t.id}`)
    }
    if (o.bin) ok((t.bins ?? []).some((b) => b.id === o.bin), `אופציה ${o.id} ב-${t.id} שייכת לדלי שאינו קיים: ${o.bin}`)
  }
  /* תווית של דלי היא מחרוזת לימודית: היא אומרת ללומד לפי מה למיין */
  for (const b of t.bins ?? []) sect(b.source, `bin ${t.id}/${b.id}`)
  for (const st of t.steps ?? []) {
    sect(st.source, `step ${t.id}/${st.id}`)
    ok(st.options.filter((o) => o.right).length === 1, `צעד ${t.id}/${st.id}: חייבת להיות תשובה נכונה אחת בדיוק`)
    for (const o of st.options) ok(!!o.note?.trim(), `צעד ${t.id}/${st.id}: לאופציה ${o.id} אין הסבר`)
  }
  if (t.interpret) {
    ok(t.interpret.options.filter((o) => o.right).length === 1, `פירוש ${t.id}: חייבת להיות תשובה נכונה אחת בדיוק`)
    for (const o of t.interpret.options) ok(!!o.note?.trim(), `פירוש ${t.id}: לאופציה ${o.id} אין הסבר`)
  }
}

/* העדויות */
for (const f of FINDS) {
  sect(f.source, `find ${f.id}`)
  ok(regionIds.has(f.region), `עדות ${f.id} באזור שאינו קיים: ${f.region}`)
  ok(!!f.body?.trim(), `עדות ${f.id} בלי גוף`)
  ok(!!f.sourcing?.trim(), `עדות ${f.id} בלי שאלת ייחוס — „מי מסר את זה" הוא חלק מן הכרטיס`)
}

/* 3 — לוח החוליות */
sect(CHAPTER_QUESTION.source, 'CHAPTER_QUESTION')
for (const l of LINKS) {
  sect(l.source, `link ${l.id}`)
  sect(l.key.source, `link ${l.id}/key`)
  ok(regionIds.has(l.region), `חוליה ${l.id} באזור שאינו קיים: ${l.region}`)
  ok(encounterIds.has(l.unlockedBy) || taskIds.has(l.unlockedBy),
    `חוליה ${l.id} נפתחת על ידי מזהה שאינו קיים: ${l.unlockedBy}`)
}

/* התרגול */
for (const q of practice.questions ?? []) {
  sect(q.source, `practice ${q.id}`)
  if (q.type === 'single') ok((q.options ?? []).filter((o) => o.right).length === 1, `תרגול ${q.id}: תשובה נכונה אחת`)
  if (q.type === 'multi') ok((q.options ?? []).filter((o) => o.right).length > 1, `תרגול ${q.id}: multi בלי כמה נכונות`)
  for (const o of q.options ?? []) ok(o.right || !!o.why?.trim(), `תרגול ${q.id}: לאופציה „${o.text}" אין הסבר`)
}
for (const t of practice.takeaways ?? []) sect(t.source, 'practice/takeaway')

/* 5 — רשימה שחורה על מחרוזות לומד */
const BLACK = [
  ['מכס', 'אינו בחוברת — §6/§8 אומרים „חסות" בלבד'],
  ['דרהם', 'אינו בחוברת'],
  ['דרך הבשמים', 'אינה בחוברת — §7 מונה משי ותבלינים'],
  ['אנצאב', 'אינו בחוברת'],
  ['רמות תימן', 'תחנה שבוטלה (15.9.2026)'],
  ['מה שחקוק מוכיח', 'בחוברת אין כתובות כלל'],
  ['שנת הפיל', 'שם פרק שהומצא'],
  ['באותה שנה נולד', 'לידת מוחמד לא בטקסט'],
  ['אני בעל הגמלים', 'נאום עבד אל-מטלב שהומצא'],
  ['פינוי מכה', 'לא בטקסט'],
]
const learner = JSON.stringify([TASKS, FINDS, LINKS, practice])
for (const [bad, why] of BLACK) if (learner.includes(bad)) errors.push(`רשימה שחורה: „${bad}" (${why})`)

console.log(`✓ ${TASKS.length} משימות · ${FINDS.length} עדויות · ${LINKS.length} חוליות · ${(practice.questions ?? []).length} שאלות תרגול`)
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
console.log('✅ כל מחרוזת לימודית מעוגנת, כל הפניה קיימת, אפס מונחים מומצאים.')
