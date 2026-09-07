'use client'

/* חדר המבחנים.

   ארבעה מסכים ומכונת מצבים אחת ביניהם: בונים מבחן, יושבים בו, מקבלים ציון
   וסוקרים, ומסתכלים על ההיסטוריה. הכל בעמוד אחד, ללא ניתוב — מבחן שנפתח
   בכתובת משלו אפשר לרענן באמצע ולאבד, וזה בדיוק מה שאסור לו לעשות.

   ⚠ המעטפת היא PracticeNav — המעטפת של האתר, לא מעטפת דומה לה.

   הגרסה הראשונה של הקובץ הזה בנתה מסטהד משלה ועמודה ממורכזת של 880px, וזו
   בדיוק התקלה ש-chapter6-practice.css מתעד שכבר תוקנה פעם אחת: „מסטהד משלו
   עם אמצע ריק, בלי סרגל צד, ועמודה ממורכזת — שני העמודים לא חלקו ולו קצה
   אחד“. אותו תיקון נעשה שם במרקאפ ולא בגיליון הסגנון, ומאותה סיבה הוא נעשה
   כאן במרקאפ: העמוד יורש את המסטהד של המאמר, את סרגל הצד הנצמד, ואת
   `.chapter-layout` — שמתחיל ב-`--content-gutter` מהקצה, בדיוק כמו כל פרק.

   סרגל הצד הוא גם תצוגת ההתקדמות היחידה, כמו בתרגולים: במסך הבנייה שלושת
   השלבים, במבחן ובסקירה שאלה לכל שורה עם וי כשהיא נענתה או נכונה, ובהיסטוריה
   מבחן לכל שורה. זה מה שהופך אותו לניווט אמיתי בין שישים שאלות ולא לקישוט.

   שתי החלטות שמגיעות מהאילוץ שהאתר סטטי, ולא מהעדפה:

   1. שאלה פתוחה נבדקת בהערכה עצמית. אין שרת, ולכן אין בדיקה אוטומטית; בדיקת
      מילות מפתח בעברית הייתה מסמנת תשובות טובות כשגויות בגלל נטייה או כתיב.
      אז נחשפת תשובת המופת עם נקודות המפתח שלה, והלומדת מסמנת מולן. הציון
      אומר במפורש איזה חלק ממנו נבדק כך.

   2. ההיסטוריה יושבת ב-localStorage של הדפדפן. היא לא נשלחת לשום מקום, וגם
      לא עוברת בין מכשירים. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ExamQuestion from './ExamQuestion'
import PracticeNav, { type NavStop } from '@/components/chapter6/summary/PracticeNav'
import TopicFilter from '@/components/TopicFilter'
import { categoryOfChapter } from '@/lib/chapters-data'
import {
  BANKS,
  LENGTHS,
  QUESTION_BY_ID,
  drawExam,
  fmtClock,
  isRight,
  scoreExam,
  timeLimitFor,
  type Answer,
  type DrawnItem,
  type SelfGrade,
} from '@/lib/exams'
import {
  HISTORY_EVENT,
  deleteAttempt,
  newId,
  readHistory,
  saveAttempt,
  type Attempt,
} from '@/lib/exams/history'

type View = 'build' | 'sit' | 'result' | 'history'

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ExamRoom() {
  const [view, setView] = useState<View>('build')

  /* -------- בניית המבחן -------- */
  const [picked, setPicked] = useState<number[]>([])
  const [length, setLength] = useState<number>(20)
  const [timed, setTimed] = useState(false)

  /* -------- המבחן החי -------- */
  const [items, setItems] = useState<DrawnItem[]>([])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [grades, setGrades] = useState<Record<string, SelfGrade>>({})
  const [held, setHeld] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [confirmLeave, setConfirmLeave] = useState(false)

  /* -------- היסטוריה -------- */
  const [history, setHistory] = useState<Attempt[]>([])
  const [ready, setReady] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = useCallback(() => setHistory(readHistory()), [])
  useEffect(() => {
    load()
    setReady(true)
    window.addEventListener(HISTORY_EVENT, load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener(HISTORY_EVENT, load)
      window.removeEventListener('storage', load)
    }
  }, [load])

  /* כמה שאלות בכלל אפשר לשאול על הפרקים שנבחרו — התקרה שהאורך נחתך אליה */
  const poolSize = useMemo(
    () => BANKS.filter((b) => picked.includes(b.chapter)).reduce((s, b) => s + b.questions.length, 0),
    [picked]
  )
  const limit = timed ? timeLimitFor(items) : 0
  const remaining = limit - elapsed
  const score = useMemo(() => scoreExam(items, answers, grades), [items, answers, grades])

  /* ------------------------------------------------------------- השעון ---- */
  /* `startedAt` ברֶף ולא ב-state: הוא נקרא בתוך ה-interval, ומ-state הוא היה
     נקרא מהרנדר שיצר אותו. הטיימר עצמו מודד מול השעון האמיתי ולא סופר
     טיקים — טאב ברקע מקבל פחות טיקים, וספירה כזו הייתה נותנת זמן מתנה. */
  const startedAt = useRef(0)
  useEffect(() => {
    if (view !== 'sit') return
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    tick()
    const h = window.setInterval(tick, 1000)
    return () => window.clearInterval(h)
  }, [view])

  /* -------------------------------------------------------- פעולות ---- */

  const start = useCallback(() => {
    if (!picked.length) return
    const seed = Date.now() & 0x7fffffff
    const n = Math.min(length, poolSize)
    const drawn = drawExam({ chapters: picked, length: n, seed })
    setItems(drawn)
    setAnswers({})
    setGrades({})
    setHeld(null)
    setAttempt({ id: newId(), at: Date.now(), chapters: [...picked].sort((a, b) => a - b), seed, timed, elapsedMs: 0, items: [] })
    startedAt.current = Date.now()
    setElapsed(0)
    setConfirmLeave(false)
    setView('sit')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [picked, length, poolSize, timed])

  const submit = useCallback(() => {
    if (!attempt) return
    const elapsedMs = Date.now() - startedAt.current
    const saved: Attempt = {
      ...attempt,
      elapsedMs,
      items: items.map(({ q }) => ({ qid: q.id, ans: answers[q.id], grade: grades[q.id] })),
    }
    setAttempt(saved)
    saveAttempt(saved)
    setView('result')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [attempt, items, answers, grades])

  /* השעון נגמר — מגישים. ההגשה עצמה היא הפעולה, לא הודעה שמבקשת להגיש: מבחן
     מתוזמן שנעצר וממתין ללחיצה נותן זמן שאין לו. */
  useEffect(() => {
    if (view === 'sit' && timed && limit > 0 && remaining <= 0) submit()
  }, [view, timed, limit, remaining, submit])

  /* הערכה עצמית של שאלה פתוחה מתעדכנת גם ברשומה השמורה, אחרת ציון שנקבע
     אחרי ההגשה לא היה חוזר בסקירה של מחר. */
  /* שני עדכונים ולא אחד מקונן בתוך השני. עדכון state בתוך פונקציית העדכון של
     state אחר, ובוודאי כתיבה ל-localStorage משם, רצים פעמיים תחת StrictMode —
     והם גם פשוט לא המקום לתופעות לוואי. */
  const grade = useCallback(
    (qid: string, g: SelfGrade) => {
      setGrades((cur) => ({ ...cur, [qid]: g }))
      if (!attempt) return
      const updated: Attempt = {
        ...attempt,
        items: attempt.items.map((it) => (it.qid === qid ? { ...it, grade: g } : it)),
      }
      setAttempt(updated)
      saveAttempt(updated)
    },
    [attempt]
  )

  /** פותח מבחן שמור לסקירה. השאלות נטענות מהמאגר לפי המזהים, בסדר שנשמר. */
  const review = useCallback((a: Attempt) => {
    const drawn: DrawnItem[] = []
    const ans: Record<string, Answer> = {}
    const gr: Record<string, SelfGrade> = {}
    for (const it of a.items) {
      const found = QUESTION_BY_ID.get(it.qid)
      if (!found) continue
      drawn.push(found)
      if (it.ans !== undefined) ans[it.qid] = it.ans
      if (it.grade) gr[it.qid] = it.grade
    }
    setItems(drawn)
    setAnswers(ans)
    setGrades(gr)
    setAttempt(a)
    setElapsed(Math.floor(a.elapsedMs / 1000))
    setView('result')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const toBuild = useCallback(() => {
    setItems([])
    setAnswers({})
    setGrades({})
    setAttempt(null)
    setConfirmLeave(false)
    setView('build')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const answeredCount = items.filter(({ q }) => {
    const a = answers[q.id]
    if (a === undefined) return false
    if (q.type === 'open') return typeof a === 'string' && a.trim().length > 0
    if (q.type === 'match') return Object.keys(a as Record<string, string>).length === q.pairs.length
    return Array.isArray(a) && a.length > 0
  }).length

  /* =============================================================== המעטפת ==== */

  /* עצירות הסרגל — משתנות לפי המסך, ובכל אחד מהם הן הניווט וגם ההתקדמות.
     ב-sit וב-result זו שורה לכל שאלה: הווי אומר „נענתה“ בזמן מבחן ו„נכונה“
     בסקירה, וזה מה שהופך שישים שאלות למשהו שאפשר לנווט בו. */
  const stops: NavStop[] = useMemo(() => {
    if (view === 'build') {
      const on = picked.length > 0
      return [
        { id: 'xr-s1', label: 'הפרקים', done: on },
        { id: 'xr-s2', label: 'אורך המבחן', done: on },
        { id: 'xr-s3', label: 'שעון', done: on },
      ]
    }
    if (view === 'history') {
      return history.map((a) => ({ id: `xh-${a.id}`, label: fmtDate(a.at), done: true }))
    }
    return items.map(({ q, chapter }) => {
      const a = answers[q.id]
      const filled =
        a !== undefined &&
        (q.type === 'open'
          ? typeof a === 'string' && a.trim().length > 0
          : q.type === 'match'
            ? Object.keys(a as Record<string, string>).length === q.pairs.length
            : Array.isArray(a) && a.length > 0)
      return {
        id: `xq-${q.id}`,
        label: `פרק ${chapter}` + (q.type === 'open' ? ' · פתוחה' : ''),
        done: view === 'result' ? (q.type === 'open' ? !!grades[q.id] : isRight(q, a)) : filled,
      }
    })
  }, [view, picked, history, items, answers, grades])

  /* השעון והמונה יושבים בסלוט הסופי של המסטהד במקום קישור החזרה — במהלך מבחן
     הם צריכים להיות גלויים תמיד, והחזרה צריכה לעבור דרך אישור. */
  const hud =
    view === 'sit' ? (
      <div className="xr-hud">
        <span className="xr-count">
          {answeredCount} / {items.length}
        </span>
        {timed ? (
          <span className={'xr-clock' + (remaining <= 60 ? ' is-low' : '')} role="timer" aria-live="off">
            {fmtClock(remaining)}
          </span>
        ) : (
          <span className="xr-clock is-up">{fmtClock(elapsed)}</span>
        )}
      </div>
    ) : undefined

  return (
    <PracticeNav
      stops={stops}
      back={{ href: '/chapters', label: 'חזרה לפרקים' }}
      subtitle="חדר המבחנים"
      end={hud}
    >
      {/* `.chapter-article` הוא העמוד של המאמר — אותה עמודה, אותו קצה, אותו
          קצב אנכי. `xr-article` מוסיף רק את מה ששייך למבחן. */}
      <main className="chapter-article xr-article">
        {view === 'build' && (
          <Build
            picked={picked}
            setPicked={setPicked}
            length={length}
            setLength={setLength}
            timed={timed}
            setTimed={setTimed}
            poolSize={poolSize}
            onStart={start}
            history={history}
            ready={ready}
            onHistory={() => setView('history')}
          />
        )}

        {view === 'sit' && (
          <>
            <div className="xr-lead">
              <h1>המבחן</h1>
              <p>
                {items.length} שאלות מתוך {attempt?.chapters.length} פרקים. אפשר לדלג ולחזור, והכל בעמוד אחד.
                {timed ? ' השעון רץ — בסופו המבחן ייבדק מעצמו.' : ' אין הגבלת זמן.'}
              </p>
            </div>
            <ol className="xr-sheet">
              {items.map(({ q, chapter }, i) => (
                <li key={q.id}>
                  <ExamQuestion
                    q={q}
                    chapter={chapter}
                    n={i + 1}
                    ans={answers[q.id]}
                    onAnswer={(a) => setAnswers((cur) => ({ ...cur, [q.id]: a }))}
                    mode="answer"
                    held={held}
                    setHeld={setHeld}
                  />
                </li>
              ))}
            </ol>
            <div className="xr-submit">
              {answeredCount < items.length && (
                <p className="xr-note">נותרו {items.length - answeredCount} שאלות ללא מענה. אפשר להגיש גם כך.</p>
              )}
              <button type="button" className="xr-go" onClick={submit}>
                הגשה ובדיקה
              </button>
              {confirmLeave ? (
                <span className="xr-confirm">
                  <span>לצאת בלי להגיש? המבחן יימחק.</span>
                  <button type="button" className="xr-secondary" onClick={toBuild}>
                    כן, לצאת
                  </button>
                  <button type="button" className="xr-secondary" onClick={() => setConfirmLeave(false)}>
                    ביטול
                  </button>
                </span>
              ) : (
                <button type="button" className="xr-secondary" onClick={() => setConfirmLeave(true)}>
                  יציאה בלי להגיש
                </button>
              )}
            </div>
          </>
        )}

        {view === 'result' && attempt && (
          <>
            <div className="xr-score">
              <p className="xr-score-n">
                <b>{Number.isInteger(score.points) ? score.points : score.points.toFixed(1)}</b>
                <span>מתוך {score.total}</span>
              </p>
              <div className="title-ornament" aria-hidden="true"><span /></div>
              <p className="xr-score-line">
                {score.closedRight} מתוך {score.closedTotal} השאלות הסגורות נענו נכון
                {score.openTotal > 0 && ` · ${score.openTotal} שאלות פתוחות בהערכה עצמית`}
              </p>
              <p className="xr-score-meta">
                {fmtDate(attempt.at)} · פרקים {attempt.chapters.join(', ')} · משך {fmtClock(Math.floor(attempt.elapsedMs / 1000))}
              </p>
              {score.openUngraded > 0 && (
                <p className="xr-score-warn">
                  {score.openUngraded} שאלות פתוחות עדיין לא הוערכו. הציון יתעדכן כשתסמנו אותן למטה.
                </p>
              )}
            </div>

            <ol className="xr-sheet">
              {items.map(({ q, chapter }, i) => (
                <li key={q.id}>
                  <ExamQuestion
                    q={q}
                    chapter={chapter}
                    n={i + 1}
                    ans={answers[q.id]}
                    onAnswer={() => {}}
                    mode="review"
                    grade={grades[q.id]}
                    onGrade={(g) => grade(q.id, g)}
                    held={null}
                    setHeld={() => {}}
                  />
                </li>
              ))}
            </ol>

            <div className="xr-submit">
              <button type="button" className="xr-go" onClick={toBuild}>
                מבחן חדש
              </button>
              <button type="button" className="xr-secondary" onClick={() => setView('history')}>
                כל המבחנים
              </button>
            </div>
          </>
        )}

        {view === 'history' && (
          <>
            <div className="xr-lead">
              <h1>המבחנים שלי</h1>
              <p>הכל נשמר בדפדפן הזה בלבד — לא נשלח לשום מקום ולא עובר בין מכשירים.</p>
            </div>
            {history.length === 0 ? (
              <p className="xr-empty">עדיין לא נעשה כאן מבחן.</p>
            ) : (
              <ul className="xr-history">
                {history.map((a) => {
                  const its = a.items.map((it) => QUESTION_BY_ID.get(it.qid)).filter((x): x is DrawnItem => !!x)
                  const ans: Record<string, Answer> = {}
                  const gr: Record<string, SelfGrade> = {}
                  for (const it of a.items) {
                    if (it.ans !== undefined) ans[it.qid] = it.ans
                    if (it.grade) gr[it.qid] = it.grade
                  }
                  const s = scoreExam(its, ans, gr)
                  return (
                    <li key={a.id} id={`xh-${a.id}`}>
                      <button type="button" className="xr-hrow" onClick={() => review(a)}>
                        <span className="xr-hscore">
                          {s.percent}<i>%</i>
                        </span>
                        <span className="xr-hbody">
                          <b>{fmtDate(a.at)}</b>
                          <span>
                            פרקים {a.chapters.join(', ')} · {a.items.length} שאלות · {fmtClock(Math.floor(a.elapsedMs / 1000))}
                            {a.timed && ' · עם שעון'}
                            {s.openUngraded > 0 && ` · ${s.openUngraded} פתוחות לא הוערכו`}
                          </span>
                        </span>
                      </button>
                      {confirmDel === a.id ? (
                        <span className="xr-confirm">
                          <button type="button" className="xr-secondary" onClick={() => { deleteAttempt(a.id); setConfirmDel(null) }}>
                            למחוק
                          </button>
                          <button type="button" className="xr-secondary" onClick={() => setConfirmDel(null)}>
                            ביטול
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="xr-del" aria-label="מחיקת המבחן" onClick={() => setConfirmDel(a.id)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="xr-submit">
              <button type="button" className="xr-go" onClick={toBuild}>
                מבחן חדש
              </button>
            </div>
          </>
        )}
      </main>
    </PracticeNav>
  )
}

/* =================================================================== בנייה ==== */

function Build({
  picked, setPicked, length, setLength, timed, setTimed, poolSize, onStart, history, ready, onHistory,
}: {
  picked: number[]
  setPicked: (n: number[]) => void
  length: number
  setLength: (n: number) => void
  timed: boolean
  setTimed: (b: boolean) => void
  poolSize: number
  onStart: () => void
  history: Attempt[]
  ready: boolean
  onHistory: () => void
}) {
  const [topic, setTopic] = useState<string | null>(null)

  const toggle = (n: number) => setPicked(picked.includes(n) ? picked.filter((x) => x !== n) : [...picked, n])

  /* הנושאים שיש בהם מאגר, ובכל אחד כמה פרקים. קטגוריה שאין בה אף פרק בנוי
     אינה מצוירת — TopicFilter מסנן אותה בעצמו לפי אורך הרשימה. */
  const topics = useMemo(() => {
    const by = new Map<string, { id: string; title: string; count: number }>()
    for (const b of BANKS) {
      const cat = categoryOfChapter.get(b.chapter)
      if (!cat) continue
      const cur = by.get(cat.id)
      if (cur) cur.count++
      else by.set(cat.id, { id: cat.id, title: cat.title, count: 1 })
    }
    return [...by.values()]
  }, [])

  const shown = topic ? BANKS.filter((b) => categoryOfChapter.get(b.chapter)?.id === topic) : BANKS
  /* פרק שנבחר ואז הוסתר בסינון נשאר בחירה — הסינון הוא תצוגה ולא איפוס.
     הספירה מתחת לשורה היא מה שאומר את זה, אחרת בחירה נעלמת בלי הסבר. */
  const hiddenPicked = picked.filter((n) => !shown.some((b) => b.chapter === n)).length

  /* אורך שאין לו מספיק שאלות אינו מוסתר אלא מסומן — כדי שיהיה ברור למה הוא
     אינו זמין, ומה צריך לעשות כדי שיהיה */
  const usable = (n: number) => picked.length > 0 && n <= poolSize

  return (
    <>
      <div className="xr-lead">
        <h1>חדר המבחנים</h1>
        <p>בחרו את הפרקים שתרצו להיבחן עליהם, את אורך המבחן, והאם לרוץ מול שעון. המבחן ייבנה מהמאגרים בחלוקה מאוזנת בין הפרקים, ויכלול גם שאלות סגורות וגם שאלות פתוחות.</p>
      </div>

      <section className="xr-step" id="xr-s1" aria-labelledby="xr-s1-t">
        <header className="xr-step-head">
          <span className="xr-n">1</span>
          <div>
            <h2 id="xr-s1-t">על אילו פרקים</h2>
            <p>אפשר לבחור כמה שרוצים. הסינון לפי נושא מצמצם את הרשימה, ואינו מבטל בחירה שכבר נעשתה.</p>
          </div>
        </header>
        <TopicFilter
          active={topic}
          onPick={setTopic}
          options={topics}
          allCount={BANKS.length}
          label="סינון הפרקים לפי נושא"
        />
        <ul className="xr-chapters">
          {shown.map((b) => {
            const on = picked.includes(b.chapter)
            return (
              <li key={b.chapter}>
                <button type="button" className={'xr-ch' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => toggle(b.chapter)}>
                  <span className="xr-ch-n">{b.chapter}</span>
                  <span className="xr-ch-name">{b.title}</span>
                  <span className="xr-ch-count">{b.questions.length} שאלות במאגר</span>
                </button>
              </li>
            )
          })}
        </ul>
        {/* „בחירת הכל“ פועל על מה שגלוי כרגע ולא על כל הפרקים: שורת סינון שנבחר בה
            נושא, וכפתור שבוחר גם את מה שהוסתר, הם שני דברים שסותרים זה את זה. */}
        <div className="xr-chapters-all">
          {(() => {
            const visible = shown.map((b) => b.chapter)
            const allVisiblePicked = visible.length > 0 && visible.every((n) => picked.includes(n))
            return (
              <button
                type="button"
                className="xr-secondary"
                onClick={() =>
                  setPicked(allVisiblePicked ? picked.filter((n) => !visible.includes(n)) : [...new Set([...picked, ...visible])])
                }
              >
                {allVisiblePicked ? 'ניקוי הבחירה' : topic ? 'בחירת כל הנושא' : 'בחירת הכל'}
              </button>
            )
          })()}
          {picked.length > 0 && (
            <span className="xr-note">
              {poolSize} שאלות זמינות ב-{picked.length} פרקים שנבחרו
              {hiddenPicked > 0 && ` · ${hiddenPicked} מהם מחוץ לנושא המסונן`}.
            </span>
          )}
        </div>
      </section>

      <section className="xr-step" id="xr-s2" aria-labelledby="xr-s2-t">
        <header className="xr-step-head">
          <span className="xr-n">2</span>
          <div>
            <h2 id="xr-s2-t">כמה שאלות</h2>
            <p>כחמישית מהן יהיו שאלות פתוחות.</p>
          </div>
        </header>
        <div className="xr-lengths">
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              className={'xr-pick' + (length === n ? ' is-on' : '')}
              aria-pressed={length === n}
              disabled={picked.length > 0 && !usable(n)}
              onClick={() => setLength(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {picked.length > 0 && length > poolSize && (
          <p className="xr-note">בפרקים שנבחרו יש {poolSize} שאלות בלבד — המבחן ייבנה מכולן.</p>
        )}
      </section>

      <section className="xr-step" id="xr-s3" aria-labelledby="xr-s3-t">
        <header className="xr-step-head">
          <span className="xr-n">3</span>
          <div>
            <h2 id="xr-s3-t">עם שעון או בלי</h2>
            <p>עם שעון: דקה לשאלה סגורה ושלוש לפתוחה, ובסופו המבחן ייבדק מעצמו.</p>
          </div>
        </header>
        <div className="xr-lengths">
          <button type="button" className={'xr-pick' + (!timed ? ' is-on' : '')} aria-pressed={!timed} onClick={() => setTimed(false)}>
            בלי הגבלת זמן
          </button>
          <button type="button" className={'xr-pick' + (timed ? ' is-on' : '')} aria-pressed={timed} onClick={() => setTimed(true)}>
            עם שעון
          </button>
        </div>
      </section>

      <div className="xr-submit">
        <button type="button" className="xr-go" disabled={!picked.length} onClick={onStart}>
          {picked.length ? 'מתחילים' : 'בחרו פרק אחד לפחות'}
        </button>
        {ready && history.length > 0 && (
          <button type="button" className="xr-secondary" onClick={onHistory}>
            המבחנים שלי ({history.length})
          </button>
        )}
      </div>
    </>
  )
}
