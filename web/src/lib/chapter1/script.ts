/* ── התסריט של תחנה: סדר אחד, מצביע אחד ──────────────────────────────────
 *
 * הבעלים שיחקה ואמרה: „הסדר של הפעולות לא מובן, הכל קורה בסדר אקראי".
 * ובצדק: ב-Game.tsx שבעה מנגנונים נפרדים פתחו שיחות, כל אחד עם טיימר
 * ותנאי משלו — סרט הקריין אחרי 1.1 שניות, פעימת ההגעה אחרי 1.4, ראאווי
 * האוטומטי אחרי 4.2 שניות של שקט, E לפי מרחק — ומכונת השלבים נגזרה
 * משיחה אחת בעוד סגירת התחנה דרשה את כולן. „המשימה נפתחה לפני ששמעתי
 * את ההסבר" ו„ראאווי מדבר באמצע דברים אחרים" הם בדיוק מה שיוצא מזה.
 *
 * כאן יש דבר אחד: רשימה מסודרת של צעדים, נגזרת מסדר הקובץ ב-dialogue.json
 * ומן המשימה של התחנה, ומצביע אחד — `nextStep` — אל הצעד הראשון שלא
 * הושלם. שורת המטרה, המצפן, רמז התקיעות, הסירובים, הפותח האוטומטי, R ו-E
 * כולם קוראים ממנו ורק ממנו. אין כאן React ואין JSON: הקובץ טהור, כדי
 * ש-node יטען אותו ב-check-script.mjs ויסמלץ כל תחנה מקצה לקצה.
 *
 * האינווריאנט היחיד (`mayOpen`): צעד נפתח רק כשכל צעד שלפניו שהוא ליבה
 * או אוטומטי הושלם. מפגשים שאינם ליבה נמצאים בתסריט ואינם חוסמים:
 * נושא אופציונלי של דמות הוא `next` רק כשהלומד עומד לידה; אחרת מדלגים
 * עליו, והוא נמנה בשער בין הדברים שפספסנו.
 *
 * כל מחרוזת כאן נאמרה כבר ב-Game.tsx לפני המעבר; אין בה טענה היסטורית —
 * רק הוראות, שמות דוברים, ושאלות ההגעה שנושאות § ב-dialogue.json. */

import type { Encounter, Region, SpeakerId } from './dialogue'
import type { Task } from './tasks'
import type { Find } from './finds'

export type ActMode = 'lamp' | 'table' | 'place' | 'panel'

export type Step =
  | { kind: 'arrive'; key: 'arrive'; id: string; core: false; auto: true }
  | { kind: 'talk'; key: string; id: string; speaker: SpeakerId; core: boolean; auto: boolean; after?: string }
  | { kind: 'look'; key: string; id: string; core: true; auto: false }
  | { kind: 'act'; key: string; mode: ActMode; core: boolean; auto: false }
  | { kind: 'interpret'; key: 'interpret'; core: boolean; auto: false }
  | { kind: 'onward'; key: 'onward'; core: false; auto: false }

export type Script = Step[]

export type Stage = 'brief' | 'look' | 'act' | 'interpret' | 'wrap' | 'done'

export interface ScriptState {
  seen: string[]
  found: string[]
  solved: string[]
  stoneLit: boolean
  tableSet: boolean
  placedAll: boolean
  interpreted: boolean
  /** מי בטווח דיבור עכשיו — מכריע אם נושא אופציונלי של דמות הוא הצעד הבא */
  nearWho: string | null
}

export interface ScriptCtx {
  region: Region
  task: Task | null
  finds: Find[]
  speakers: Record<string, string>
  hostSpot: Record<string, { x: number; z: number }>
  gate: { x: number; z: number } | null
  revealFind: Find | null
  /** האם יש תחנה הלאה — 'הדרך הסתיימה' אחרת */
  onward: boolean
}

/** מזהה הפעימה הסינתטית של ההגעה — נרשם ב-seen כמו כל מפגש */
export const arriveId = (regionId: string) => `rawi-arrive-${regionId}`

const isTaskTriggered = (e: Encounter) => String(e.trigger ?? '').startsWith('task:')
const isArriveCine = (e: Encounter) => e.speaker === 'narrator' && (e.trigger ?? 'arrive') === 'arrive'
const AUTO_SPEAKERS: SpeakerId[] = ['rawi', 'narrator']

/* ── מה המשימה מבקשת להניח ──────────────────────────────────────────────
   עבר לכאן מ-Game.tsx (taskNeeded): שליפה = התשובות הנכונות בזו אחר זו;
   מיון/הצגה = כל מה שיש לו גוף בעולם, וכשאין גוף לאיש — כל האופציות;
   בחירה = האופציות הנכונות. */
export function placeablesOf(task: Task | null): { needed: string[]; hasProps: boolean } {
  if (!task) return { needed: [], hasProps: false }
  if (task.steps?.length) {
    return { needed: task.steps.map((st) => st.options.find((o) => o.right)?.id ?? st.id), hasProps: false }
  }
  const sortLike = ['sort', 'connect', 'observe'].includes(task.kind ?? '')
  const present = task.kind === 'present'
  /* גוף בעולם: חפץ שגוררים (`prop`), או עמדה על המפה שאסימון השיירה
     נגרר אליה (`spot` במשימת תכנון) — בשניהם הפעולה היא ביד */
  const hasProps = task.options.some((o) => o.prop || (task.kind === 'plan' && o.spot))
  if (sortLike || present) {
    const withProp = task.options.filter((o) => o.prop)
    return { needed: (withProp.length > 0 ? withProp : task.options).map((o) => o.id), hasProps }
  }
  return { needed: task.options.filter((o) => o.right).map((o) => o.id), hasProps }
}

export function buildScript(
  region: Region,
  task: Task | null,
  opts: { revealFirst: boolean; isMecca: boolean },
): Script {
  const core = new Set(region.core ?? [])
  const script: Script = []
  const talk = (e: Encounter): Step => ({
    kind: 'talk',
    key: e.id,
    id: e.id,
    speaker: e.speaker,
    core: core.has(e.id),
    auto: AUTO_SPEAKERS.includes(e.speaker),
    after: String(e.trigger ?? '').startsWith('after:') ? String(e.trigger).slice(6) : undefined,
  })

  /* 1. סרט קריין שפותח את התחנה — לפני ראאווי, לא מתחתיו */
  const leading = region.encounters.filter(isArriveCine)
  for (const e of leading) script.push(talk(e))
  /* 2. ההגעה: המקום והשאלה */
  script.push({ kind: 'arrive', key: 'arrive', id: arriveId(region.id), core: false, auto: true })
  /* 3. כל השאר לפי סדר הקובץ, בלי מה שנפתח אחרי המשימה */
  for (const e of region.encounters) {
    if (leading.includes(e) || isTaskTriggered(e)) continue
    script.push(talk(e))
  }
  const taskCore = !!task && core.has(task.id)
  /* 4. במחנה מאירים לפני שקוראים */
  if (opts.revealFirst) script.push({ kind: 'act', key: 'act:lamp', mode: 'lamp', core: taskCore, auto: false })
  /* 5. מה שצריך לראות לפני שמשיבים */
  for (const id of task?.needsFinds ?? []) script.push({ kind: 'look', key: `look:${id}`, id, core: true, auto: false })
  /* 6. במכה מסדרים את השולחן לפני שמשווים */
  if (opts.isMecca) script.push({ kind: 'act', key: 'act:table', mode: 'table', core: taskCore, auto: false })
  /* 7. ההנחה, ביד או בפאנל */
  const { needed, hasProps } = placeablesOf(task)
  if (needed.length > 0) {
    script.push({ kind: 'act', key: hasProps ? 'act:place' : 'act:panel', mode: hasProps ? 'place' : 'panel', core: taskCore, auto: false })
  }
  /* 8. הפירוש */
  if (task?.interpret) script.push({ kind: 'interpret', key: 'interpret', core: taskCore, auto: false })
  /* 9. מה שנאמר אחרי שהתחנה נעשתה */
  for (const e of region.encounters) if (isTaskTriggered(e)) script.push(talk(e))
  /* 10. והלאה */
  script.push({ kind: 'onward', key: 'onward', core: false, auto: false })
  return script
}

export function isDone(step: Step, st: ScriptState, task: Task | null): boolean {
  const solvedTask = !!task && st.solved.includes(task.id)
  switch (step.kind) {
    case 'arrive':
    case 'talk':
      return st.seen.includes(step.id)
    case 'look':
      return st.found.includes(step.id)
    case 'act':
      if (solvedTask) return true
      if (step.mode === 'lamp') return st.stoneLit
      if (step.mode === 'table') return st.tableSet
      return st.placedAll
    case 'interpret':
      return solvedTask || st.interpreted
    case 'onward':
      return false
  }
}

/** נושא של דמות שאינו ליבה: קיים, לא חוסם, ונפתח רק כשעומדים לידה */
export const isOptionalHostTalk = (s: Step) => s.kind === 'talk' && !s.core && !s.auto

/** כל צעד קודם שהוא ליבה או אוטומטי הושלם */
export function mayOpen(script: Script, i: number, st: ScriptState, task: Task | null): boolean {
  for (let j = 0; j < i; j++) {
    const s = script[j]
    if ((s.core || s.auto) && !isDone(s, st, task)) return false
  }
  return true
}

/** הצעד הראשון שלא הושלם. לעולם לא undefined: 'onward' אינו מושלם. */
export function nextStep(script: Script, st: ScriptState, task: Task | null): Step {
  for (const s of script) {
    if (isDone(s, st, task)) continue
    if (isOptionalHostTalk(s) && s.kind === 'talk' && st.nearWho !== s.speaker) continue
    return s
  }
  return script[script.length - 1]
}

export function indexOf(script: Script, step: Step): number {
  return script.findIndex((s) => s.key === step.key)
}

/** תאימות ל-World ול-TaskPanel: מה השלב שהצעד הזה שייך לו */
export function stageOf(step: Step, script: Script): Stage {
  if (step.kind === 'look') return 'look'
  if (step.kind === 'act') return 'act'
  if (step.kind === 'interpret') return 'interpret'
  if (step.kind === 'onward') return 'done'
  const i = indexOf(script, step)
  const afterWork = script.slice(0, i).some((s) => s.kind === 'act' || s.kind === 'look' || s.kind === 'interpret')
  return afterWork ? 'wrap' : 'brief'
}

/** מזהי הליבה שטרם הושלמו — מה שמחזיק את השער קדימה */
export function requiredLeft(script: Script, st: ScriptState, task: Task | null): string[] {
  return script
    .filter((s) => s.core && !isDone(s, st, task))
    .map((s) => (s.kind === 'talk' || s.kind === 'look' ? s.id : task?.id ?? s.key))
}

/** מה שאינו חובה ולא נעשה — לפעימת „פספסנו" בשער */
export function optionalLeft(script: Script, st: ScriptState, task: Task | null): { talks: string[] } {
  return {
    talks: script
      .filter((s): s is Extract<Step, { kind: 'talk' }> => s.kind === 'talk' && !s.core && !isDone(s, st, task))
      .map((s) => s.id),
  }
}

export function encounterOf(step: Step, region: Region): Encounter | null {
  if (step.kind !== 'talk') return null
  return region.encounters.find((e) => e.id === step.id) ?? null
}

/* ── מה כתוב על המסך ──────────────────────────────────────────────────── */

function hostName(speaker: string, ctx: ScriptCtx): string {
  return ctx.speakers[speaker] ?? speaker
}

/** כמה נושאים נשארו לשמוע מן הדובר הזה לפני הצעד הבא שאינו שיחה —
    אופציונליים נספרים רק כשעומדים לידו */
function talksLeftFor(step: Extract<Step, { kind: 'talk' }>, script: Script, st: ScriptState, task: Task | null): number {
  const i = indexOf(script, step)
  let n = 0
  for (let j = i; j < script.length; j++) {
    const s = script[j]
    if (s.kind !== 'talk') break
    if (s.speaker !== step.speaker) continue
    if (isDone(s, st, task)) continue
    if (isOptionalHostTalk(s) && st.nearWho !== s.speaker) continue
    n++
  }
  return n
}

const RAWI_WAIT = 'עצרו רגע — לרָאוִי יש מה לומר כאן'
const NARRATOR_WAIT = 'יש כאן עוד רגע אחד שמחכה לקרות'

export function instructionFor(step: Step, script: Script, st: ScriptState, ctx: ScriptCtx, task: Task | null): string {
  const asker = task?.asker ?? ctx.speakers.rawi ?? 'רָאוִי'
  switch (step.kind) {
    case 'arrive':
      return RAWI_WAIT
    case 'talk': {
      if (step.speaker === 'narrator') return NARRATOR_WAIT
      if (step.speaker === 'rawi') return RAWI_WAIT
      const host = hostName(step.speaker, ctx)
      const first = !script.some(
        (s) => s.kind === 'talk' && s.speaker === step.speaker && s.key !== step.key && isDone(s, st, task),
      )
      /* השאלה של התחנה היא המטרה שלה: מי שקורא „מי הן שתי האימפריות"
         הולך אל השליח בשביל תשובה, לא בשביל להשלים משבצת. */
      if (first && ctx.region.ask) return `${ctx.region.ask.text} — ${host} כאן (E)`
      const n = talksLeftFor(step, script, st, task)
      return `יש עוד ${n === 1 ? 'נושא אחד' : `${n} נושאים`} לשמוע מ${host} — לחצו E לידו`
    }
    case 'look': {
      const left = script.filter((s) => s.kind === 'look' && !isDone(s, st, task)).length
      return left === 1
        ? 'הביטו במה שמאיר — נותר כאן דבר אחד לראות'
        : `הביטו במה שמאיר — נותרו כאן ${left} דברים לראות`
    }
    case 'act':
      switch (step.mode) {
        case 'lamp':
          return 'האירו את הכתב שעל האוכף: קחו את הלפיד שלידו, גררו אותו אליו והחזיקו.'
        case 'table':
          return 'סדרו את השולחן: הניחו כל מקור במקומו — מה שנמסר מחוץ לאסלאם, מה שנאמר בקוראן, ומה שנכתב דורות אחר כך.'
        case 'panel':
          /* אין מה לגרור כאן, ולכן ההוראה חייבת לומר איפה זה נפתח */
          return `${task?.prompt ?? ''}: התקרבו אל התחנה ולחצו E`
        case 'place':
          return task?.hint ?? task?.prompt ?? ''
      }
      return ''
    case 'interpret':
      return `${asker} מחכה לתשובה — לחצו E ליד התחנה`
    case 'onward':
      return ctx.onward ? 'התחנה הושלמה — המשיכו בדרך' : 'הדרך הסתיימה'
  }
}

/** המשפט השני של רמז התקיעות: איפה, לא מה */
export function whereFor(step: Step, ctx: ScriptCtx, task: Task | null): string | null {
  switch (step.kind) {
    case 'arrive':
      return 'ראאווי צועד לצידכם — עצרו לרגע והוא ידבר'
    case 'talk':
      if (step.speaker === 'rawi') return 'ראאווי צועד לצידכם — עצרו לרגע, או לחצו R'
      if (step.speaker === 'narrator') return null
      return `${hostName(step.speaker, ctx)} עומד כאן ומחכה — התקרבו ולחצו E`
    case 'look':
      return 'חפשו את מה שמאיר על הקרקע'
    case 'act':
      return step.mode === 'lamp' ? 'הלפיד עומד ליד הכתב' : `התחנה של ${task?.asker ?? 'רָאוִי'} מסומנת באור`
    case 'interpret':
      return 'עמדו ליד התחנה'
    case 'onward':
      return ctx.onward ? 'צאו מהאזור בכיוון שהמצפן מסמן בזהב' : null
  }
}

/** לאן המצפן מצביע */
export function positionFor(step: Step, ctx: ScriptCtx): { x: number; z: number } | null {
  switch (step.kind) {
    case 'arrive':
      return null
    case 'talk':
      return step.auto ? null : ctx.hostSpot[step.speaker] ?? null
    case 'look': {
      const f = ctx.finds.find((x) => x.id === step.id)
      return f ? { x: f.x, z: f.z } : null
    }
    case 'act':
      if (step.mode === 'lamp' && ctx.revealFind) return { x: ctx.revealFind.x, z: ctx.revealFind.z }
      return ctx.task ? { x: ctx.task.x, z: ctx.task.z } : null
    case 'interpret':
      return ctx.task ? { x: ctx.task.x, z: ctx.task.z } : null
    case 'onward':
      return ctx.gate
  }
}

/** מה ראאווי אומר כשלוחצים E על משהו שאינו הצעד הבא */
export function refusalFor(step: Step, script: Script, st: ScriptState, ctx: ScriptCtx, task: Task | null): string {
  const what = instructionFor(step, script, st, ctx, task)
  return `רגע — קודם ${what}`
}
