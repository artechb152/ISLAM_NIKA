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
import { useCallback, useMemo, useRef, useState } from 'react'
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
    prompt: 'סדרו את תחנות המסע לפי הסדר שבו נעברו',
    steps: [
      'רמות תימן — הכתובת החרותה באבן',
      'מחנה הלילה — תכנון המסלול לאור המדורה',
      'תחנת הגבול — בצילן של שתי אימפריות',
      'המעבר הצר — מכס תמורת מעבר בחסות',
      'ית׳רב — שוק משותף ודין נפרד',
      'מכה — הכעבה ושלוש האבנים',
    ],
    ok: 'זה הסדר. המסע עולה מדרום לצפון — מרמות תימן ועד מכה, תחנה אחר תחנה.',
    retry:
      'הכיוון הוא מדרום לצפון. הדרך נפתחת ברמות תימן ומסתיימת במכה; תחנת הגבול והמעבר הצר הם שלבי הביניים שבהם פוגשים את האימפריות ואת השבטים, וית׳רב באה לפני מכה.',
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
      { left: 'נצרות שהגיעה מאקסום שמעבר לים ומבין אלראפדין', right: 'המנזר' },
      { left: 'הכעבה, האבן השחורה וריבוי האלילים', right: 'מכה' },
    ],
    ok: 'נכון. שש תחנות, שישה דברים שונים שהמסע בא ללמד.',
    retry:
      'לכו לפי מה שנאמר בכל תחנה עצמה: בגבול דיברו על שתי האימפריות, במעבר הצר על החסות והמכס, בדרך על מה שנכנס לארגז ומה שלא, בית׳רב על השכנוּת, במנזר על הנצרות ואורחות הנזירים, ובמכה על הכעבה והאלילים.',
  },
  {
    id: 'finds',
    label: 'מה מלמד כל ממצא',
    type: 'match',
    prompt: 'התאימו כל דבר שנלמד בדרך לממצא שממנו הוא נלמד',
    pairs: [
      { left: 'הממלכה ששלטה על איראן ועיראק, ובירתה קטסיפון על גדת החידקל', right: 'מטבע כסף סאסאני' },
      { left: 'קהילה יהודית שסחרה ושרה עם שכניה — אך שפטה לפי חוקיה שלה', right: 'נרתיק לספר' },
      { left: 'נצרות שהגיעה מאקסום שמעבר לים ומבין אלראפדין', right: 'כתובת על אבן המנזר' },
      { left: 'תשובה שמתקבלת בהטלת חיצים ליד הפסל', right: 'אשפת חיצים' },
    ],
    ok: 'כך זה נקרא. כל חפץ מעיד על דבר מסוים — ורק עליו.',
    retry:
      'שאלו מה החפץ עצמו מסוגל להראות: מטבע מעיד היכן נטבע, נרתיק ספר — מי גר בקרבתו, כתובת בשפה שאינה ערבית — מהיכן הגיעו הכותבים, וחיצים ליד פסל — כיצד שאלו בו.',
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
          'רק הביזנטית הייתה נוצרית אורתודוקסית; דתה של האליטה השלטת בממלכה הסאסאנית הייתה זורואסטרית. וחלוקה לא הייתה: אף אחת מהן לא שאפה לכבוש חלקים מחצי האי.',
      },
      {
        text: 'שתיהן שלטו באזור החג׳אז וגבו ממנו מס',
        why:
          'לא. החג׳אז היה אזור חבוי יחסית, והאימפריות לא גילו בו עניין רב. המכס שנגבה בדרך היה של השבט ששמר עליה.',
      },
    ],
    ok: 'כך. הביזנטית החליפה את רומא העתיקה ודתה נוצרית אורתודוקסית; הסאסאנית שלטה על איראן ועיראק, ובירתה קטסיפון על גדת החידקל.',
    retry: 'היעזרו בשני הממצאים שנאספו בתחנת הגבול: המטבע והחותם. כל אחד מהם בא מצד אחר.',
  },
  {
    id: 'road',
    label: 'מה עבר בדרך',
    type: 'multi',
    prompt: 'מה עבר בדרכי הסחר שהמסע הולך בהן?',
    options: [
      { text: 'משי', right: true },
      { text: 'תבלינים', right: true },
      { text: 'רעיונות ומושגים מונותאיסטיים מהיהדות ומהנצרות', right: true },
      {
        text: 'שורשי האמונה הנוצרית, שנלמדו במכה לעומקם',
        why:
          'לא הם. הנזיר אמר זאת במפורש: על השורשים יודעים במכה מעט מאוד. מה שעבר הוא מה שראו — צניעות, פרישות, דאגה לנזקק וליתום, התבודדות ומנהגים פולחניים.',
      },
      {
        text: 'צבאות האימפריות, שיצאו לכבוש את החג׳אז',
        why:
          'לא. החג׳אז היה אזור חבוי יחסית והאימפריות לא גילו בו עניין רב; חרף התחרות ביניהן, אף אחת מהן לא שאפה לכבוש חלקים מחצי האי ערב.',
      },
    ],
    ok: 'שלושתם. משי ותבלינים נכנסו לארגז — והרעיונות נסעו עם האנשים, בשיחות ליד המדורה ובסיפורים שנוסעים מביאים איתם.',
    retry: 'שניים מהדברים הועמסו על הגמל. השלישי לא נכנס לשום ארגז, ובכל זאת עבר בדרך הזו.',
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
    id: 'evidence',
    label: 'חקוק ומסופר',
    type: 'single',
    prompt: 'המסע נפתח מול כתובת חרותה באבן. מה כתובת כזאת מסוגלת להוכיח?',
    options: [
      { text: 'שחיו כאן אנשים שבנו, עיבדו וכתבו', right: true },
      {
        text: 'שכל מה שמסופר על התקופה במסורת נכון',
        why:
          'זה בדיוק מה שהיא לא יכולה להוכיח. את רוב המידע על התקופה אנחנו יודעים מהספרות ומהמסורת המוסלמית, שנכתבו הרבה אחרי אותם ימים ויש לקחת אותן בעירבון מוגבל. האבן מעידה על עצמה, לא עליהן.',
      },
      {
        text: 'שאי אפשר לדעת דבר על התקופה',
        why:
          'ההפך. יש מה לדעת — רק צריך להבחין בין מה שחקוק למה שמסופר, וזה הכלל הראשון שנרשם במסע הזה.',
      },
      {
        text: 'שאנשי התקופה קראו לעצמם ג׳אהליה',
        why:
          'את השם הזה נתנה לתקופה המסורת המוסלמית המאוחרת, במבט לאחור — לא אנשיה לעצמם. כתובת אינה יכולה להעיד על שם שניתן דורות אחריה.',
      },
    ],
    ok: 'זה מה שהיא מוכיחה. מי שחרט אותה עמד כאן וחרט אותה בזמנה — האבן אינה מוסרת דבר בשמו של מישהו אחר.',
    retry: 'הפרידו בין מה שחקוק לבין מה שמסופר: האבן מעידה על עצמה בלבד.',
  },
  {
    id: 'eve',
    label: 'הסביבה שבה הופיע האסלאם',
    type: 'multi',
    prompt: 'ובמבט לאחור, מקצה הדרך: מה נכון לומר על הסביבה שבה הופיעה בשורתו של מוחמד?',
    options: [
      { text: 'הערבים לא היוו איום על אף אחת מהאימפריות', right: true },
      { text: 'האימפריות לא הצליחו להשליט כאן את דתן — אך רעיונותיהן חלחלו', right: true },
      { text: 'לצד עובדי האלילים ישבו כאן גם יהודים וגם נוצרים', right: true },
      {
        text: 'חצי האי היה ריק מאמונות',
        why:
          'לא. בדרך הזו פגשנו יהודים בית׳רב, נזיר במנזר ופנתיאון שלם במכה — ומעבר לגבול, אליטה זורואסטרית. הסביבה הייתה מלאה אמונות.',
      },
      {
        text: 'רוב תושבי חצי האי היו נוצרים',
        why:
          'הביזנטים אמנם השפיעו — מילים רבות בערבית מקורן לטיני ויווני, כמו „מבצר״ קצר ו„מגדל״ ברג׳ — אבל את דתם הם לא הצליחו להשליט כאן.',
      },
    ],
    ok: 'זו התמונה. חרף התחרות בין האימפריות, אף אחת מהן לא שאפה לכבוש חלקים מחצי האי — ובכל זאת הדהודי רעיונותיהן נשמעים בקוראן.',
    retry: 'שלושה מהמשפטים נאמרו במפורש בקצה הדרך; שניים סותרים את מה שנאמר שם.',
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

  const move = useCallback((i: number, dir: -1 | 1) => {
    setState('idle')
    setItems((cur) => {
      const j = i + dir
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  function check() {
    const ok = items.every((s, i) => s === q.steps[i])
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      <ol className="p2-order">
        {items.map((s, i) => (
          <li key={s}>
            <span className="p2-order-n">{i + 1}</span>
            <span className="p2-order-text">{s}</span>
            <span className="p2-order-moves">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || state === 'right'} aria-label="הזזה למעלה">
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1 || state === 'right'}
                aria-label="הזזה למטה"
              >
                ↓
              </button>
            </span>
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

  return (
    <PracticeNav stops={stops} back={{ href: '/chapter1', label: 'חזרה לפרק 1' }}>
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
          מסע אל ערב טרום האסלאם — שמונה שאלות. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת, ותשובה שאינה נכונה
          מקבלת הסבר ולא ציון.
        </p>

        {QUESTIONS.map((q, i) => (
          <section
            className={'article-section p2-q' + (solved.has(q.id) ? ' is-solved' : '')}
            id={`p1-${q.id}`}
            key={q.id}
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
