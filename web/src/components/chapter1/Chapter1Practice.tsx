'use client'

/* Chapter 1's closing practice.

   Same contract, same shell and the same exercise surfaces as chapters 2, 3 and
   6: `PracticeNav` is the article's own masthead + rail, and every class used
   below (`.p2-*`, `.article-section`, `.section-heading`, `.title-ornament`)
   already exists — this file invents no UI. Chapter 1 is a game rather than an
   article, so the ONE thing it adds is which picture stands in the banner, and
   that is a single rule at the end of chapter1.css.

   The questions rest only on the chapter's own approved content: dialogue.json,
   finds.ts and tasks.ts. Nothing here states a fact the traveller was not told
   or shown on the road. Two rules they obey, as in chapter 2: nothing is asked
   that answers itself by sitting next to its own gloss, and no option invents a
   fact the source does not carry.

   `islam:chapter:1 = 'done'` is written when the last question closes, exactly
   as chapters 2, 3 and 6 write theirs — the journey is the chapter, and this is
   where the chapter is signed off. */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'

/* `why` IS THE WHOLE POINT OF GETTING IT WRONG. Chapter 2 answers a wrong check
   with one sentence per question; here a wrong option can answer for itself,
   because chapter 1's own tasks.ts does exactly that — every option in the game
   carries a `note` that explains why it is the option it is, right or wrong.
   Same idea, same line, same `.p2-feedback` paragraph: no new surface, only a
   better sentence in it. Falls back to the question's `retry` when the picked
   option has nothing of its own to say. */
type Option = { text: string; right?: boolean; why?: string }

type Q =
  | { id: string; label: string; type: 'single' | 'multi'; prompt: string; ok: string; retry: string; options: Option[] }
  | { id: string; label: string; type: 'match'; prompt: string; ok: string; retry: string; pairs: { left: string; right: string }[] }
  | { id: string; label: string; type: 'order'; prompt: string; ok: string; retry: string; steps: string[] }

const QUESTIONS: Q[] = [
  {
    id: 'stations',
    label: 'סדר התחנות',
    type: 'order',
    /* חמש מתוך תשע, ולכן „המרכזיות" ולא „התחנות". הניסוח הקודם ביקש
       את סדר המסע והציג שש מתוך תשע — בלי דרך ההעמסה, המנזר והיציאה —
       והמשוב עוד הוסיף „תחנה אחר תחנה". */
    prompt: 'סדרו את חמש התחנות המרכזיות לפי הסדר שבו נעברו',
    steps: [
      'רמות תימן — הכתובת החרותה באבן',
      'תחנת הגבול — בצילן של שתי אימפריות',
      'המעבר הצר — מכס תמורת מעבר בחסות',
      'ית׳רב — שוק משותף ודין נפרד',
      'מכה — הכעבה ושלוש האבנים',
    ],
    /* זה סדר המסע, ולא סדר על המפה: השיירה עולה צפונה עד ית'רב, ומשם
       פונה בחזרה דרומה אל מכה — שיושבת דרומית לית'רב. הניסוח הקודם
       („מדרום לצפון — מרמות תימן ועד מכה") לימד גאוגרפיה הפוכה. */
    ok:
      'זה הסדר שבו עברנו. השיירה עולה צפונה מרמות תימן עד ית׳רב, ומשם פונה בחזרה דרומה אל מכה — ' +
      'שיושבת מדרום לית׳רב. בין אלה עברנו גם במחנה הלילה, בדרך ההעמסה ובמנזר.',
    retry:
      'העלייה היא מדרום לצפון: רמות תימן, תחנת הגבול, המעבר הצר וית׳רב. מכה אינה ההמשך צפונה — ' +
      'היא יושבת מדרום לית׳רב, והשיירה חוזרת אליה בסוף.',
  },
  {
    id: 'regions',
    label: 'כל רעיון ותחנתו',
    type: 'match',
    /* THE SHORT SIDE IS THE ANSWER, which is why the idea is on the left and the
       station on the right and not the other way round: `.p2-slot` is a 320px
       box and chapter 2's own answers are two or three words. A sentence in a
       slot is a paragraph in a button. */
    prompt: 'התאימו כל דבר שנלמד בדרך לתחנה שבה הוא נלמד',
    pairs: [
      { left: 'שתי אימפריות מצפון לחצי האי — הביזנטית והסאסאנית', right: 'תחנת הגבול' },
      { left: 'שבטים נוודים כבני חסות של האימפריות, ומכס תמורת מעבר בטוח', right: 'המעבר הצר' },
      { left: 'משי ותבלינים בארגז — ורעיונות שאיש לא ארז', right: 'הדרך וההעמסה' },
      { left: 'שוק משותף לשכנים, ודין נפרד לכל שבט', right: 'ית׳רב' },
      { left: 'נצרות שהגיעה מאקסום שמעבר לים וממסופוטמיה — בין הפרת והחידקל', right: 'המנזר' },
      { left: 'הכעבה, האבן השחורה וריבוי האלילים', right: 'מכה' },
    ],
    ok: 'נכון. שש תחנות, שישה דברים שונים שהמסע בא ללמד.',
    retry:
      'לכו לפי מה שנאמר בכל תחנה עצמה: בגבול דיברו על שתי האימפריות, במעבר הצר על החסות והמכס, בדרך על מה שנכנס לארגז ומה שלא, בית׳רב על השכנוּת, במנזר על הנצרות ואורחות הנזירים, ובמכה על הכעבה והאלילים.',
  },
  {
    id: 'empires',
    label: 'שתי האימפריות',
    type: 'single',
    prompt: 'שתי אימפריות שכנו מצפון לחצי האי. כיצד ישבו על המפה?',
    options: [
      { text: 'הביזנטית מצפון־מערב, הסאסאנית־פרסית מצפון־מזרח', right: true },
      {
        text: 'הסאסאנית־פרסית מצפון־מערב, הביזנטית מצפון־מזרח',
        why:
          'הכיוונים הפוכים. מטבע הכסף שנאסף בתחנת הגבול נטבע בקטסיפון שבמזרח, וחותם החרס בא מנתיביה של האימפריה הנוצרית שבמערב.',
      },
      {
        text: 'שתיהן היו נוצריות, וחילקו ביניהן את חצי האי',
        why:
          'רק הביזנטית הייתה נוצרית אורתודוקסית; דתה של האליטה השלטת בממלכה הסאסאנית הייתה זורואסטרית. וחלוקה כזאת לא הייתה — חצי האי לא היה נתון לשלטונן.',
      },
      {
        text: 'שתיהן שלטו באזור החג׳אז וגבו ממנו מס',
        why:
          'לא. החג׳אז היה אזור חבוי יחסית, ולפי מה שבידינו האימפריות לא גילו בו עניין רב. המכס שנגבה בדרך היה של השבט ששמר עליה.',
      },
    ],
    ok: 'כך. הביזנטית החליפה את רומא העתיקה ודתה נוצרית אורתודוקסית; הסאסאנית שלטה על איראן ועיראק, ובירתה קטסיפון על גדת החידקל.',
    retry: 'היעזרו בשני הממצאים שנאספו בתחנת הגבול: המטבע והחותם. כל אחד מהם בא מצד אחר.',
  },
  {
    id: 'scope',
    label: 'עד היכן מגיע ממצא',
    type: 'single',
    /* החליף שאלת התאמה שנייה ברצף, ואיתה גם את ההיגיון שלה: נרתיק ספר
       לבדו „הוכיח" שם קהילה שסחרה, שרה ושפטה לפי חוקיה, וכתובת אחת
       „הוכיחה" סיפור גאוגרפי שלם. השאלה עוסקת עכשיו בדיוק בפער הזה. */
    prompt: 'בשוק ית׳רב נמצא נרתיק לספר. מה הוא עצמו מסוגל להראות?',
    options: [
      { text: 'שמישהו שהחזיק ספרים חי או סחר במקום הזה', right: true },
      {
        text: 'שהקהילה היהודית סחרה עם שכניה, שרה איתם ושפטה לפי חוקיה',
        why:
          'זה נכון — אבל לא הנרתיק הוכיח את זה. את השכנוּת, השירה והדין שמענו מן הסוחר עצמו. חפץ מראה שמישהו היה שם; מה שהוא עשה שם מגיע ממקורות אחרים.',
      },
      {
        text: 'שרוב תושבי ית׳רב היו יהודים',
        why:
          'חפץ אחד אינו סופר אוכלוסייה. הוא מעיד על נוכחות במקום שבו נמצא, לא על יחסים מספריים בעיר.',
      },
      {
        text: 'שהיהודים הגיעו לית׳רב מן הצפון',
        why:
          'הנרתיק אינו נושא כתובת ואינו אומר מהיכן בא. שאלת המוצא נדונה בשיחה, ושם היא נאמרה בזהירות — לא כמסקנה מחפץ.',
      },
    ],
    ok: 'זה הגבול שלו. חפץ מעיד על נוכחות; מה שקרה סביבו מגיע מן העדויות האחרות, ומהן ביחד נבנית התמונה.',
    retry: 'שאלו מה החפץ עצמו יכול להראות, בלי מה ששמעתם בשיחה לידו.',
  },
  {
    id: 'yathrib',
    label: 'השכנוּת בית׳רב',
    type: 'single',
    prompt: 'בית׳רב חיו היהודים בשכנות לערבים. מה נשאר של כל שבט לעצמו?',
    options: [
      { text: 'הדין והדת — כל שבט ומנהגו', right: true },
      {
        text: 'המסחר — יהודים וערבים לא סחרו זה עם זה',
        why:
          'המסחר דווקא עבר בין הבתים: השכן קנה תמרים כל בוקר. יחסי מסחר התקיימו, ובחיי היום־יום שררה שכנות בשלום.',
      },
      {
        text: 'השירה — כל קהילה ושירתה שלה',
        why:
          'השירה היא בדיוק מה שכן חצה: בערב ישבו יחד ושמעו את אותה שירה. נושאי תרבות משותפים היו, והשירה הבולטת שבהם.',
      },
      {
        text: 'הציפייה למשיח — עליה לא סיפרו לשכנים',
        why:
          'דווקא עליה כן סיפרו. „לא סגרנו דלת״, אמר הסוחר: הם שיתפו את שכניהם באמונתם, במסורות, ואפילו בציפייה למשיח.',
      },
    ],
    ok: 'נכון. השוק היה משותף, החוק לא — כל שבט וחוקיו, וזה מה שאִפשר לשכנוּת להחזיק דורות.',
    retry: 'המסחר, השירה ואפילו הציפייה למשיח חצו בין הבתים. דבר אחד נשאר בבית פנימה.',
  },
  {
    id: 'build',
    label: 'לבנות את התמונה',
    type: 'multi',
    /* במקום „בחרו את מקבץ הטענות הנכון": המשתמש בוחר עדויות שאסף בדרך,
       ומהן נבנית הקביעה. הטענה נשארת אותה טענה — אבל היא מוסקת מחומר
       ולא מזוכרת מרשימה. */
    prompt:
      'בקצה הדרך עומדת קביעה אחת: „הסביבה שבה הופיעה בשורתו של מוחמד לא הייתה ריקה מאמונות." ' +
      'אילו מן העדויות שאספתם בדרך תומכות בה?',
    options: [
      { text: 'הנרתיק לספר בשוק ית׳רב', right: true },
      { text: 'הכתובת על אבן המנזר', right: true },
      { text: 'האבן הניצבת (אנצאב) שבמכה', right: true },
      { text: 'אשפת החיצים שליד הפסל', right: true },
      {
        text: 'מטבע הכסף הסאסאני שבתחנת הגבול',
        why:
          'המטבע מראה לאן פונה הדרך ומי טובע בה מטבע — לא במה האמינו בחצי האי. הוא שייך לשאלת האימפריות, לא לשאלת האמונות.',
      },
      {
        text: 'בד המשי שהועמס על הגמל',
        why:
          'המשי הוא סחורה. הוא מעיד על מסחר למרחקים, ולא על מי שהתפלל למה.',
      },
    ],
    ok:
      'ארבע עדויות, ארבע אמונות שונות: ספר של קהילה יהודית, כתובת של נזירים נוצרים, אבן ניצבת ואשפת חיצים של פולחן מקומי. ' +
      'ביחד הן מראות שהמקום היה מלא — וזו הסביבה שבתוכה הופיעה הבשורה.',
    retry:
      'שאלו על כל חפץ: האם הוא נוגע במה שמישהו האמין בו? שניים מהם מדברים על מסחר ועל אימפריות, ולא על אמונה.',
  },
]

/* what the traveller takes with them — the four sentences the road was built to
   leave behind, in the order it left them */
const TAKEAWAYS = [
  'מה שחקוק מוכיח; מה שמסופר נבחן בזהירות. את רוב המידע על התקופה אנחנו יודעים מהמסורת המוסלמית המאוחרת, ויש לקחת אותה בעירבון מוגבל.',
  'מצפון לחצי האי ישבו שתי אימפריות — הביזנטית הנוצרית והסאסאנית־פרסית — והשבטים הנוודים שביניהן היו בני חסותן ומתווכיהן, שומרי נתיבי הסחר.',
  'בדרך הזו עברו משי ותבלינים — ואיתם, בלי שאיש ארז אותם, רעיונות ומושגים מונותאיסטיים מהיהדות ומהנצרות.',
  'חצי האי לא היה חלל ריק: יהודים בית׳רב, נוצרים במנזר ופנתיאון שלם במכה. זו הסביבה שבה הופיעה בשורתו של מוחמד.',
]

/** deterministic shuffle — the same reader gets the same board on a reload */
function shuffled<T>(items: T[], seed: number): T[] {
  const a = [...items]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type State = 'idle' | 'wrong' | 'right'

function Feedback({ state, text }: { state: State; text: string }) {
  if (state === 'idle') return null
  return (
    <p className={'p2-feedback' + (state === 'right' ? ' is-right' : '')} role="status">
      {text}
    </p>
  )
}

/* ---------------- one question per type ---------------- */

function Choice({ q, onSolved }: { q: Extract<Q, { type: 'single' | 'multi' }>; onSolved: () => void }) {
  const opts = useMemo(() => shuffled(q.options, q.id.length * 97), [q])
  const [picked, setPicked] = useState<string[]>([])
  const [state, setState] = useState<State>('idle')
  const [said, setSaid] = useState('')
  const multi = q.type === 'multi'

  function toggle(text: string) {
    if (state === 'right') return
    setState('idle')
    setPicked((p) => (multi ? (p.includes(text) ? p.filter((x) => x !== text) : [...p, text]) : [text]))
  }
  function check() {
    const want = new Set(q.options.filter((o) => o.right).map((o) => o.text))
    const got = new Set(picked)
    const ok = want.size === got.size && [...want].every((w) => got.has(w))
    /* THE WRONG OPTION ANSWERS FOR ITSELF where it has something to say — the
       reader is told why THIS choice is not the one, not merely that it is not.
       With nothing picked wrong (a `multi` that is simply short) the question's
       own line explains what is missing. */
    const badly = q.options.find((o) => !o.right && got.has(o.text) && o.why)
    setSaid(ok ? q.ok : (badly?.why ?? q.retry))
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      <ul className="p2-options">
        {opts.map((o) => (
          <li key={o.text}>
            <button
              type="button"
              className={
                'p2-option' +
                (picked.includes(o.text) ? ' is-picked' : '') +
                (state === 'right' && o.right ? ' is-right' : '')
              }
              aria-pressed={picked.includes(o.text)}
              onClick={() => toggle(o.text)}
            >
              {o.text}
            </button>
          </li>
        ))}
      </ul>
      {multi && <p className="p2-hint">אפשר לסמן יותר מאחת.</p>}
      <div className="p2-actions">
        <button type="button" className="p2-check" disabled={!picked.length || state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} text={said} />
      </div>
    </>
  )
}

function Match({ q, onSolved }: { q: Extract<Q, { type: 'match' }>; onSolved: () => void }) {
  const rows = q.pairs
  const answers = useMemo(() => shuffled(q.pairs.map((p) => p.right), q.id.length * 53), [q])
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [held, setHeld] = useState<string | null>(null)
  const heldRef = useRef<string | null>(null)
  const [state, setState] = useState<State>('idle')
  const done = state === 'right'
  const placed = new Set(Object.values(chosen))

  /* hold an answer, then give it to a row — and clicking a filled row hands the
     answer back to the bank. Chapter 2's two moves exactly, including the ref:
     read from state, the slot's handler sees the value from the render that
     attached it, so a reader fast enough to pick and drop inside one tick
     places the PREVIOUS answer and the whole board comes out shifted by one. */
  const put = (row: string) => {
    const h = heldRef.current
    setState('idle')
    setChosen((c) => {
      const next = { ...c }
      if (next[row]) {
        delete next[row]
        return next
      }
      if (!h) return next
      for (const k of Object.keys(next)) if (next[k] === h) delete next[k]
      next[row] = h
      return next
    })
    if (h) {
      heldRef.current = null
      setHeld(null)
    }
  }
  const hold = (a: string) => {
    setState('idle')
    const next = heldRef.current === a ? null : a
    heldRef.current = next
    setHeld(next)
  }

  function check() {
    const ok = rows.every((r) => chosen[r.left] === r.right)
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      <ul className="p2-bank" aria-label="התשובות">
        {answers.map((a) => (
          <li key={a}>
            <button
              type="button"
              className={'p2-chip' + (held === a ? ' is-held' : '') + (placed.has(a) ? ' is-placed' : '')}
              aria-pressed={held === a}
              disabled={done || placed.has(a)}
              onClick={() => hold(a)}
            >
              {a}
            </button>
          </li>
        ))}
      </ul>
      <ul className="p2-match">
        {rows.map((r) => (
          <li className="p2-match-row" key={r.left}>
            <span className="p2-match-left">{r.left}</span>
            <button
              type="button"
              className={'p2-slot' + (chosen[r.left] ? ' is-full' : '')}
              disabled={done}
              onClick={() => put(r.left)}
              aria-label={chosen[r.left] ? `${r.left}: ${chosen[r.left]} — לחצו כדי להחזיר` : `${r.left}: בחרו תשובה`}
            >
              {chosen[r.left] ?? ''}
            </button>
          </li>
        ))}
      </ul>
      <div className="p2-actions">
        <button
          type="button"
          className="p2-check"
          disabled={Object.keys(chosen).length < rows.length || done}
          onClick={check}
        >
          בדיקה
        </button>
        <Feedback state={state} text={state === 'right' ? q.ok : q.retry} />
      </div>
    </>
  )
}

/** Put the steps in order. The board starts shuffled and the reader walks a
    step up or down until the chain reads the way it was walked. */
function Order({ q, onSolved }: { q: Extract<Q, { type: 'order' }>; onSolved: () => void }) {
  const [items, setItems] = useState<string[]>(() => shuffled(q.steps, q.id.length * 71))
  const [state, setState] = useState<State>('idle')
  /** מה מוחזק עכשיו — בעכבר או במקלדת. אותו מצב לשתי הדרכים. */
  const [held, setHeld] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  /* גרירה, ולא שני חצאי-כפתורים.
     ‎↑/↓ זעירים הם מטרה של כמה פיקסלים, וסידור חמישה פריטים דרכם הוא
     תריסר לחיצות מדויקות. הגרירה היא הדרך הראשית; המקלדת עושה בדיוק
     את אותו דבר — רווח מרים ומניח, החצים מזיזים את מה שמוחזק — כדי
     שמי שאינו משתמש בעכבר יקבל את אותה פעולה ולא פעולה אחרת. */
  const moveTo = useCallback((from: number, to: number) => {
    setState('idle')
    setItems((cur) => {
      if (to < 0 || to >= cur.length || from === to) return cur
      const next = [...cur]
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it)
      return next
    })
  }, [])

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (state === 'right') return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setHeld((h) => (h === i ? null : i))
      return
    }
    if (held === null) return
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault(); moveTo(held, held - 1); setHeld(held - 1)
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault(); moveTo(held, held + 1); setHeld(held + 1)
    }
  }

  function check() {
    const ok = items.every((s, i) => s === q.steps[i])
    setState(ok ? 'right' : 'wrong')
    if (ok) { setHeld(null); onSolved() }
  }

  return (
    <>
      <p className="p1-order-how">גררו את השורות לסדר הנכון. במקלדת: רווח מרים ומניח, והחצים מזיזים.</p>
      <ol className="p2-order p1-order">
        {items.map((s, i) => (
          <li
            key={s}
            draggable={state !== 'right'}
            tabIndex={0}
            role="button"
            aria-grabbed={held === i}
            aria-label={`${i + 1}. ${s}`}
            className={
              (held === i ? 'is-held' : '') + (over === i && held !== null && held !== i ? ' is-over' : '')
            }
            onKeyDown={(e) => onKey(e, i)}
            onDragStart={(e) => { setHeld(i); e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { e.preventDefault(); setOver(i) }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (held !== null) moveTo(held, i); setHeld(null); setOver(null) }}
            onDragEnd={() => { setHeld(null); setOver(null) }}
            onClick={() => {
              if (state === 'right') return
              if (held === null) setHeld(i)
              else { moveTo(held, i); setHeld(null) }
            }}
          >
            <span className="p2-order-n">{i + 1}</span>
            <span className="p2-order-text">{s}</span>
            <span className="p1-order-grip" aria-hidden="true">⋮⋮</span>
          </li>
        ))}
      </ol>
      <div className="p2-actions">
        <button type="button" className="p2-check" disabled={state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} text={state === 'right' ? q.ok : q.retry} />
      </div>
    </>
  )
}

/* ---------------- the page ---------------- */

export default function Chapter1Practice() {
  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [finished, setFinished] = useState(false)
  /** איזו שאלה על המסך עכשיו */
  const [at, setAt] = useState(0)

  const solve = useCallback((id: string) => {
    setSolved((s) => {
      if (s.has(id)) return s
      const next = new Set(s).add(id)
      if (next.size === QUESTIONS.length) {
        /* the chapter is signed off here, as it is on every other chapter's
           practice. Blocked storage must never break the page. */
        try {
          window.localStorage.setItem('islam:chapter:1', 'done')
        } catch {
          /* private mode — the screen still finishes */
        }
        setFinished(true)
      }
      return next
    })
  }, [])

  /* the rail IS the progress display, as it is on chapters 2, 3 and 6: a tick
     beside an exercise when it is solved, and the name of every exercise
     reachable from anywhere on the page. No bar, no percentage, no score. */
  const stops = QUESTIONS.map((q) => ({ id: `p1-${q.id}`, label: q.label, done: solved.has(q.id) }))
  /* הסרגל מצביע על שאלה שאולי מוסתרת עכשיו — לחיצה עליו צריכה להחליף
     את השאלה המוצגת ולא לגלול אל כלום. */
  useEffect(() => {
    const onHash = () => {
      const id = location.hash.replace('#p1-', '')
      const i = QUESTIONS.findIndex((q) => q.id === id)
      if (i >= 0) setAt(i)
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <PracticeNav stops={stops} subtitle="פרק 1 · תרגול מסכם" back={{ href: '/chapter1', label: 'חזרה לפרק 1' }}>
      <main className="chapter-article p2-main">
        {/* THE CHAPTER'S OWN BANNER — the article shell's band, carrying the
            still the journey opens on rather than chapter 2's desert. */}
        <div className="ch2-hero p1-banner">
          <div className="ch2-hero-media" aria-hidden="true" />
          <div className="ch2-hero-copy">
            <h1 id="p1-title" className="ch2-hero-title">
              התרגול המסכם
            </h1>
          </div>
        </div>

        <p className="p2-lead" data-reveal>
          מסע אל ערב טרום האסלאם — שש שאלות, אחת בכל פעם. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת, ותשובה שאינה נכונה
          מקבלת הסבר ולא ציון.
        </p>

        {/* שאלה אחת בכל פעם.
            שמונה תרגילים על עמוד אחד ארוך הם דף שגוללים, לא תרגול
            שעושים: אי אפשר לדעת כמה נשאר, והתשובה הבאה כבר על המסך.
            מה שנפתר נשאר פתוח לצפייה מן הסרגל, אבל מה שמוצג הוא
            השאלה הנוכחית בלבד. */}
        {QUESTIONS.map((q, i) => (
          <section
            className={'article-section p2-q' + (solved.has(q.id) ? ' is-solved' : '')}
            id={`p1-${q.id}`}
            key={q.id}
            hidden={i !== at}
            aria-labelledby={`p1-${q.id}-t`}
          >
            <header className="section-heading" data-reveal>
              <div>
                <h2 id={`p1-${q.id}-t`}>
                  <span className="p2-q-n">{String(i + 1).padStart(2, '0')}</span>
                  {q.prompt}
                </h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true">
                <span />
              </div>
            </header>
            <div className="p2-work" data-reveal>
              {(q.type === 'single' || q.type === 'multi') && <Choice q={q} onSolved={() => solve(q.id)} />}
              {q.type === 'match' && <Match q={q} onSolved={() => solve(q.id)} />}
              {q.type === 'order' && <Order q={q} onSolved={() => solve(q.id)} />}
            </div>
            <nav className="p1-steps" aria-label="מעבר בין השאלות">
              <button type="button" className="hud-card-btn" disabled={at === 0} onClick={() => setAt(at - 1)}>
                → הקודמת
              </button>
              <span className="p1-steps-count">שאלה {at + 1} מתוך {QUESTIONS.length}</span>
              <button
                type="button"
                className="hud-card-btn is-primary"
                disabled={at >= QUESTIONS.length - 1}
                onClick={() => setAt(at + 1)}
              >
                {solved.has(q.id) ? 'הבאה ←' : 'לדלג ←'}
              </button>
            </nav>
          </section>
        ))}

        {finished && (
          <>
            {/* WHAT THE ROAD LEAVES BEHIND. Four sentences, in the article's own
                section block — not a summary of the exercises just finished, but
                the chapter's own conclusions, stated once. */}
            <section className="article-section p2-q" id="p1-takeaways" aria-labelledby="p1-takeaways-t">
              <header className="section-heading">
                <div>
                  <h2 id="p1-takeaways-t">מה לוקחים מן הדרך</h2>
                </div>
                <div className="title-ornament section-ornament" aria-hidden="true">
                  <span />
                </div>
              </header>
              <ul className="p1-takeaways">
                {TAKEAWAYS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>

            <div className="p2-done" role="status">
              <div className="title-ornament" aria-hidden="true">
                <span />
              </div>
              <p>הפרק הושלם.</p>
              <Link className="ch2-end-link" href="/chapters">
                לכל פרקי הלמידה
              </Link>
            </div>
          </>
        )}
      </main>
    </PracticeNav>
  )
}
