/* חדר המבחנים — מרשם המאגרים וההגרלה.

   קובץ אחד יודע אילו מאגרים קיימים, ואיך בונים מהם מבחן. הרכיבים לא נוגעים
   ב-JSON ישירות: הם מקבלים מבחן מוגרל ומציגים אותו.

   הוספת פרק היא שתי שורות כאן ותו לא — ייבוא, ואיבר ב-BANKS. כל השאר נגזר:
   מסך הבנייה, ההגרלה, הניקוד וההיסטוריה קוראים מהמרשם הזה ולא מרשימה משלהם. */

import type { Bank, BankQuestion, Difficulty } from './types'
import ch1 from './banks/ch1.json'
import ch2 from './banks/ch2.json'
import ch3 from './banks/ch3.json'
import ch4 from './banks/ch4.json'
import ch5 from './banks/ch5.json'
import ch6 from './banks/ch6.json'

/* לפי סדר הפרקים, לא לפי סדר הכתיבה — הסדר הזה הוא מה שמסך הבנייה מצייר. */
export const BANKS: Bank[] = [ch1, ch2, ch3, ch4, ch5, ch6] as unknown as Bank[]

/* `as const` על הצמד ולא בלעדיו: בלי זה `.map` מסיק `(number | Bank)[][]`,
   ו-`new Map` אינו מקבל את זה. */
export const BANK_BY_CHAPTER = new Map(BANKS.map((b) => [b.chapter, b] as const))

/** כל שאלה במערכת, לפי מזהה — כך שסקירה של מבחן שמור אינה צריכה לשמור את השאלות עצמן */
export const QUESTION_BY_ID = new Map<string, { chapter: number; q: BankQuestion }>()
for (const b of BANKS) for (const q of b.questions) QUESTION_BY_ID.set(q.id, { chapter: b.chapter, q })

/** האורכים שהמשתמשת בוחרת מהם */
export const LENGTHS = [10, 20, 40, 60] as const

/* ------------------------------------------------------------------ הגרלה ---- */

/** mulberry32 — גנרטור זרעי קטן. אותו זרע מחזיר את אותו מבחן בדיוק, וזה מה
 *  שמאפשר לשמור מבחן בהיסטוריה לפי הזרע שלו במקום לפי תוכנו. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], rnd: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** מוציא n שאלות מתוך pool, פרושות על שלוש רמות הקושי.
 *
 *  התבנית 1·2·3·2 נותנת משקל עודף לרמה הבינונית, כי היא הרוב בכל מאגר. דלי
 *  שהתרוקן מדלג — ומכאן שהפונקציה לעולם אינה נכשלת ולעולם אינה מחזירה פחות
 *  ממה שיש בבריכה. זו כל התועלת שהשדה `difficulty` נותן: הוא לא מוצג לאיש. */
function pickSpread(pool: BankQuestion[], n: number, rnd: () => number): BankQuestion[] {
  const buckets: Record<Difficulty, BankQuestion[]> = { 1: [], 2: [], 3: [] }
  for (const q of pool) buckets[q.difficulty].push(q)
  for (const k of [1, 2, 3] as Difficulty[]) buckets[k] = shuffled(buckets[k], rnd)

  const pattern: Difficulty[] = [1, 2, 3, 2]
  const out: BankQuestion[] = []
  let i = 0
  while (out.length < n) {
    let b = buckets[pattern[i++ % pattern.length]]
    if (!b.length) {
      const alt = ([1, 2, 3] as Difficulty[])
        .filter((k) => buckets[k].length)
        .sort((x, y) => buckets[y].length - buckets[x].length)[0]
      if (alt === undefined) break
      b = buckets[alt]
    }
    out.push(b.pop()!)
  }
  return out
}

export interface ExamOptions {
  /** מספרי הפרקים שנבחרו */
  chapters: number[]
  /** מספר השאלות הכולל */
  length: number
  seed: number
}

export interface DrawnItem {
  chapter: number
  q: BankQuestion
}

/** היחס בין פתוחות לסגורות במבחן. חמישית — כך שמבחן של 20 שאלות נושא ארבע
 *  פתוחות, ומבחן של 10 נושא שתיים. */
export const OPEN_RATIO = 0.2

/** מחלק סכום בין k משתתפים באופן שווה ככל האפשר; העודף הולך לראשונים */
function split(total: number, k: number): number[] {
  const base = Math.floor(total / k)
  const extra = total - base * k
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0))
}

/** בונה מבחן: חלוקה מאוזנת בין הפרקים שנבחרו, ובכל פרק יחס קבוע בין סגורות
 *  לפתוחות ופריסה על רמות הקושי. הסדר הסופי מעורבב, כך שהמבחן אינו קורא
 *  כרשימת פרקים אלא כמבחן אחד. */
export function drawExam(opts: ExamOptions): DrawnItem[] {
  const rnd = rng(opts.seed)
  /* איזה פרק מקבל את השאלה העודפת — מוגרל, אחרת פרק 1 תמיד גדול יותר */
  const chapters = shuffled(
    opts.chapters.filter((n) => BANK_BY_CHAPTER.has(n)),
    rnd
  )
  if (!chapters.length) return []

  const shares = split(opts.length, chapters.length)

  /* ⚠ מספר הפתוחות נקבע ברמת המבחן ולא ברמת הפרק, ולא בגלל אלגנטיות.
     החישוב הקודם עשה `round(share * 0.2)` בכל פרק בנפרד, ובמבחן של עשר שאלות
     על חמישה פרקים כל פרק קיבל שתיים — `round(0.4)` הוא אפס — כך שיצא מבחן
     שלם בלי אף שאלה פתוחה. היחס שייך למבחן, אז הוא מחושב עליו, ורק אז מחולק. */
  const openTotal = opts.length > 0 ? Math.max(1, Math.round(opts.length * OPEN_RATIO)) : 0
  const openShares = split(Math.min(openTotal, opts.length), chapters.length)
  const out: DrawnItem[] = []

  chapters.forEach((chapter, i) => {
    const bank = BANK_BY_CHAPTER.get(chapter)!
    const share = shares[i]
    /* לא יותר פתוחות ממה שהפרק הזה קיבל בכלל — קורה רק במבחן קצר מאוד */
    const wantOpen = Math.min(openShares[i], share)

    const opens = bank.questions.filter((q) => q.type === 'open')
    const closed = bank.questions.filter((q) => q.type !== 'open')

    const gotOpen = pickSpread(opens, Math.min(wantOpen, opens.length), rnd)
    /* מה שלא נמצא בפתוחות מתמלא בסגורות, ולהפך — כך שהאורך שנבחר נשמר */
    const gotClosed = pickSpread(closed, Math.min(share - gotOpen.length, closed.length), rnd)

    for (const q of [...gotOpen, ...gotClosed]) out.push({ chapter, q })
  })

  return shuffled(out, rnd)
}

/* ------------------------------------------------------------------ בדיקה ---- */

/** תשובת הלומדת לשאלה אחת.
 *  single/multi — הטקסטים שנבחרו · match — מהצד השמאלי לצד הימני · open — הטקסט */
export type Answer = string[] | Record<string, string> | string

export type SelfGrade = 'full' | 'partial' | 'miss'

export const SELF_WEIGHT: Record<SelfGrade, number> = { full: 1, partial: 0.5, miss: 0 }

/** האם תשובה לשאלה סגורה נכונה. פתוחה אינה נבדקת כאן — היא נבדקת בהערכה עצמית. */
export function isRight(q: BankQuestion, a: Answer | undefined): boolean {
  if (a === undefined) return false
  if (q.type === 'single' || q.type === 'multi') {
    const want = new Set(q.options.filter((o) => o.right).map((o) => o.text))
    const got = new Set(Array.isArray(a) ? a : [])
    return want.size === got.size && [...want].every((w) => got.has(w))
  }
  if (q.type === 'match') {
    const chosen = (a ?? {}) as Record<string, string>
    return q.pairs.every((p) => chosen[p.left] === p.right)
  }
  return false
}

export interface Score {
  closedTotal: number
  closedRight: number
  openTotal: number
  /** סכום משקלי ההערכה העצמית — לא מספר שלם */
  openScore: number
  /** כמה פתוחות עדיין לא הוערכו */
  openUngraded: number
  points: number
  total: number
  percent: number
}

export function scoreExam(
  items: DrawnItem[],
  answers: Record<string, Answer>,
  grades: Record<string, SelfGrade>
): Score {
  let closedTotal = 0
  let closedRight = 0
  let openTotal = 0
  let openScore = 0
  let openUngraded = 0
  for (const { q } of items) {
    if (q.type === 'open') {
      openTotal++
      const g = grades[q.id]
      if (g === undefined) openUngraded++
      else openScore += SELF_WEIGHT[g]
    } else {
      closedTotal++
      if (isRight(q, answers[q.id])) closedRight++
    }
  }
  const points = closedRight + openScore
  const total = closedTotal + openTotal
  return {
    closedTotal,
    closedRight,
    openTotal,
    openScore,
    openUngraded,
    points,
    total,
    percent: total ? Math.round((points / total) * 100) : 0,
  }
}

/* -------------------------------------------------------------------- זמן ---- */

/** דקה לשאלה סגורה, שלוש לפתוחה. זה הזמן שהמבחן מקבל כשהמשתמשת בוחרת בשעון. */
export const SECONDS_CLOSED = 60
export const SECONDS_OPEN = 180

export function timeLimitFor(items: DrawnItem[]): number {
  return items.reduce((s, { q }) => s + (q.type === 'open' ? SECONDS_OPEN : SECONDS_CLOSED), 0)
}

export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}
