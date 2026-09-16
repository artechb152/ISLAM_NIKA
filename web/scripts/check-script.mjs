/* ── שער התסריט של פרק 1 ─────────────────────────────────────────────────
 *
 * script.ts הוא הסדר היחיד של תחנה. השער הזה בונה אותו לכל תחנה ומסמלץ
 * לומד: מן המצב הריק, בכל איטרציה הצעד הבא נבדק מול `mayOpen`, מושלם,
 * וכך עד `onward`. אם צעד אינו ניתן לפתיחה בתורו, אם מפגש חסר או כפול,
 * או אם רצף הזהב של תחנה השתנה — הבנייה נופלת, והשינוי נראה בדיף.
 *
 * הרצה: node scripts/check-script.mjs   (חלק מ-npm run verify)
 */
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const dlg = JSON.parse(await readFile(new URL('src/lib/chapter1/dialogue.json', root), 'utf8'))
const { TASKS } = await import(new URL('src/lib/chapter1/tasks.ts', root).href)
const { FINDS } = await import(new URL('src/lib/chapter1/finds.ts', root).href)
const S = await import(new URL('src/lib/chapter1/script.ts', root).href)
const { PLACEMENTS } = await import(new URL('src/lib/chapter1/placements.ts', root).href)

const errors = []
const ok = (c, m) => { if (!c) errors.push(m) }

/* רצפי הזהב: מה כל תחנה עושה, בסדר. שינוי בנתונים = דיף כאן. */
const GOLD = {
  'night-camp': ['opening', 'arrive', 'rawi-intro', 'act:lamp', 'look:find-camp-tradition', 'act:place', 'interpret', 'camp-departure', 'onward'],
  'border-post': ['arrive', 'envoy-empires', 'envoy-sasanian', 'rawi-zoroaster', 'chief-tribes', 'rawi-ghassan', 'act:panel', 'interpret', 'onward'],
  'loading-road': ['arrive', 'rawi-seep', 'act:place', 'ideas-afterload', 'onward'],
  yathrib: ['arrive', 'jewish-arrival', 'jewish-south', 'jewish-neighbors', 'jewish-difference', 'jewish-messiah', 'act:place', 'interpret', 'onward'],
  'narrow-pass': ['arrive', 'rawi-checkpoint', 'act:panel', 'interpret', 'rawi-recall-done', 'onward'],
  monastery: ['arrive', 'monk-christianity', 'monk-influence', 'monk-practices', 'monk-quran', 'act:place', 'onward'],
  mecca: ['arrive', 'merchant-idols', 'merchant-blackstone', 'merchant-hubal', 'merchant-goddesses', 'rawi-hisham', 'rawi-abraham', 'abraha-story', 'birds-cinematic', 'act:table', 'act:panel', 'interpret', 'onward'],
  exit: ['arrive', 'rawi-summary', 'act:panel', 'interpret', 'rawi-echoes', 'onward'],
}

const empty = () => ({ seen: [], found: [], solved: [], stoneLit: false, tableSet: false, placedAll: false, interpreted: false, nearWho: null })
const complete = (step, st, task) => {
  switch (step.kind) {
    case 'arrive': case 'talk': st.seen = [...st.seen, step.id]; break
    case 'look': st.found = [...st.found, step.id]; break
    case 'act': if (step.mode === 'lamp') st.stoneLit = true; else if (step.mode === 'table') st.tableSet = true; else st.placedAll = true; break
    case 'interpret': st.interpreted = true; if (task) st.solved = [...st.solved, task.id]; break
  }
}

for (const region of dlg.regions) {
  const task = TASKS.find((t) => t.region === region.id) ?? null
  const finds = FINDS.filter((f) => f.region === region.id)
  const revealFind = finds.find((f) => f.id === 'find-camp-tradition') ?? null
  const script = S.buildScript(region, task, { revealFirst: !!revealFind, isMecca: region.id === 'mecca' })
  const where = `${region.id}`
  const keys = script.map((s) => s.key)

  /* מבנה */
  ok(keys[keys.length - 1] === 'onward', `${where}: הצעד האחרון אינו onward`)
  ok(keys[0] === (region.id === 'night-camp' ? 'opening' : 'arrive'), `${where}: הצעד הראשון הוא ${keys[0]}`)
  const ids = region.encounters.map((e) => e.id)
  for (const id of ids) ok(keys.filter((k) => k === id).length === 1, `${where}: המפגש ${id} מופיע ${keys.filter((k) => k === id).length} פעמים`)
  for (const id of region.core ?? []) {
    const mapped = script.some((s) => (s.kind === 'talk' && s.id === id) || (task && task.id === id && (s.kind === 'act' || s.kind === 'interpret')))
    ok(mapped, `${where}: מזהה ליבה ${id} אינו ממופה לצעד`)
  }
  for (const s of script) {
    if (s.kind === 'talk' && s.after) {
      const ai = keys.indexOf(s.after)
      ok(ai >= 0 && ai < keys.indexOf(s.key), `${where}: ${s.id} ממתין ל-${s.after} שאינו לפניו`)
    }
  }
  const gold = GOLD[region.id]
  if (gold) ok(JSON.stringify(keys) === JSON.stringify(gold), `${where}: הרצף השתנה:\n     יש:   ${keys.join(' → ')}\n     צפוי: ${gold.join(' → ')}`)
  else errors.push(`${where}: אין רצף זהב — הוסיפו אותו ל-check-script.mjs`)

  /* הקשר לטקסטים */
  const ctx = {
    region, task, finds,
    speakers: dlg.speakers,
    hostSpot: Object.fromEntries((PLACEMENTS[region.id] ?? []).map((p) => [p.who, { x: p.x, z: p.z }])),
    gate: { x: 0, z: 0 }, revealFind, onward: region.id !== 'exit',
  }

  /* סימולציה א׳: לומד שאינו עומד ליד איש — נושאים אופציונליים של דמות מדולגים */
  {
    const st = empty()
    const visited = []
    for (let i = 0; i <= script.length + 1; i++) {
      const n = S.nextStep(script, st, task)
      ok(S.mayOpen(script, S.indexOf(script, n), st, task), `${where}: הצעד ${n.key} הוא הבא אך אינו ניתן לפתיחה`)
      ok(S.instructionFor(n, script, st, ctx, task).trim().length > 0, `${where}: אין הוראה לצעד ${n.key}`)
      if (!n.auto && n.kind !== 'onward' && n.kind !== 'act' && n.kind !== 'interpret') {
        ok(S.positionFor(n, ctx) !== null, `${where}: אין יעד למצפן בצעד ${n.key}`)
      }
      if (n.kind === 'onward') break
      visited.push(n.key)
      complete(n, st, task)
    }
    ok(visited.length <= script.length, `${where}: הסימולציה לא הסתיימה`)
    ok(S.requiredLeft(script, st, task).length === 0, `${where}: בסוף הדרך נשארה ליבה: ${S.requiredLeft(script, st, task).join(', ')}`)
    const optional = script.filter(S.isOptionalHostTalk).map((s) => s.id)
    for (const id of optional) ok(!visited.includes(id), `${where}: הנושא האופציונלי ${id} נפתח בלי לעמוד ליד הדובר`)
    ok(JSON.stringify(S.optionalLeft(script, st, task).talks) === JSON.stringify(optional), `${where}: optionalLeft ≠ ${optional.join(', ')}`)
  }

  /* סימולציה ב׳: לומד שעומד ליד כל דמות — כל נושא נשמע, לפי סדר הקובץ */
  {
    const st = empty()
    const visited = []
    for (let i = 0; i <= script.length + 1; i++) {
      /* הלומד ניגש לכל דמות: קודם מנסים לעמוד ליד כל אחת — אם יש לה
         נושא בתור הוא הצעד; אחרת הצעד הוא מה שמתקבל מרחוק */
      const hosts = [...new Set(script.filter((s) => s.kind === 'talk' && !s.auto).map((s) => s.speaker))]
      let n = null
      for (const h of hosts) {
        st.nearWho = h
        const c = S.nextStep(script, st, task)
        if (c.kind === 'talk' && !c.auto && c.speaker === h) { n = c; break }
      }
      if (!n) { st.nearWho = null; n = S.nextStep(script, st, task) }
      ok(S.mayOpen(script, S.indexOf(script, n), st, task), `${where} (ב׳): ${n.key} אינו ניתן לפתיחה`)
      if (n.kind === 'onward') break
      visited.push(n.key)
      complete(n, st, task)
    }
    const talks = script.filter((s) => s.kind === 'talk').map((s) => s.id)
    ok(JSON.stringify(visited.filter((k) => talks.includes(k))) === JSON.stringify(talks), `${where} (ב׳): סדר השיחות ${visited.join(' → ')}`)
  }
}

/* כלל הבעלים: לא מונולוג — אין שני מפגשים רצופים של אותה דמות עם after: */
for (const r of dlg.regions) {
  for (let i = 1; i < r.encounters.length; i++) {
    const a = r.encounters[i - 1], b = r.encounters[i]
    if (b.trigger === `after:${a.id}` && a.speaker === b.speaker && a.speaker !== 'narrator') {
      errors.push(`${r.id}: ${b.id} משורשר אחרי ${a.id} של אותו דובר — מונולוג`)
    }
  }
}

console.log(`✓ ${dlg.regions.length} תחנות, ${Object.keys(GOLD).length} רצפי זהב`)
if (errors.length) { console.error('❌\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
console.log('✅ כל תחנה נבנית לתסריט אחד, וכל צעד נפתח בתורו.')
