'use client'

/* The dialogue surface. With the voice-over dropped (user decision, 2026-08-07)
   the text is the only channel, so it carries the pacing: lines reveal at
   reading speed and a click completes the current line instantly. Nothing here
   invents wording — every string comes from dialogue.json with its §source. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PORTRAIT,
  SPEAKERS,
  encounterScript,
  type Choice,
  type Encounter,
  type SpeakerId,
} from '@/lib/chapter1/dialogue'

const REVEAL_MS_PER_CHAR = 18

interface Step {
  speaker: SpeakerId
  text: string
  source: string
}

/* ── הסרט שבחלונית ──────────────────────────────────────────────────
   שלוש תקלות ישבו כאן, וכולן אותה תקלה:

   1. „הסרטון נתקע באמצע". הסרט התנגן ‎autoPlay‎ עם
      ‎muted={!once || isMuted()}‎ — כלומר סרט „פעם אחת" (הפתיחה
      ותמונת אבּרהה) התנגן *עם קול* אם צליל האתר דלוק. דפדפן חוסם
      ניגון אוטומטי עם קול: ‎play()‎ נדחה, הסרט לא מתחיל, ואף אחד לא
      שומע על כך. נמדד: ‎opening.mp4‎ ו-‎abraha.mp4‎ נושאים פס קול
      אמיתי, ולכן דווקא הם נחסמו.
   2. השומר שהרג את הסרט. אחרי 2.5 שניות נבדק ‎videoWidth === 0‎, ואם
      לא היה פריים — הסרט הוחלף בתמונה קפואה לתמיד. ‎abraha.mp4‎ הוא
      13.7MB; בחיבור סביר הוא לא מפענח פריים ראשון בשתי שניות וחצי,
      וזה בדיוק „נתקע ולא ממשיך".
   3. לא היו פקדים בכלל. אי אפשר היה לעצור סרט ולהמשיך אותו.

   מה שיש כאן עכשיו: הסרט מתחיל תמיד מושתק — זה מה שהדפדפן מרשה —
   ולידו כפתור קול, כפתור השהיה/המשך, וכפתור ניגון אם הדפדפן בכל
   זאת סירב. השומר יורד רק על שגיאה אמיתית של הרכיב, והוא מתבטל ברגע
   שמגיע ‎loadeddata‎, כך שסרט איטי מקבל את הזמן שלו במקום להימחק. */
function FilmFrame({ file, once }: { file: string; once: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [dead, setDead] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const poster = `/assets/anim-video/${file.replace(/\.mp4$/, '')}-poster.jpg`

  useEffect(() => {
    setDead(false)
    setPlaying(false)
    setMuted(true)
    const v = ref.current
    if (!v) return
    v.muted = true
    /* ניגון מושתק מותר תמיד; אם בכל זאת נדחה — מציגים כפתור ניגון
       ולא מוחקים את הסרט. */
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    const onErr = () => setDead(true)
    v.addEventListener('error', onErr)
    return () => v.removeEventListener('error', onErr)
  }, [file])

  const toggle = useCallback(() => {
    const v = ref.current
    if (!v) return
    /* המשך מאותה נקודה: לא נוגעים ב-currentTime ולא טוענים מחדש */
    if (v.paused) void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    else v.pause()
  }, [])

  const toggleSound = useCallback(() => {
    const v = ref.current
    if (!v) return
    const next = !v.muted
    v.muted = next
    setMuted(next)
    /* הפעלת קול על סרט שכבר מתנגן מותרת — החסימה היא רק על *התחלה*
       עם קול. אם הוא מושהה, ההפעלה מחזירה אותו לניגון. */
    if (!next && v.paused) void v.play().then(() => setPlaying(true)).catch(() => {})
  }, [])

  if (dead) {
    return (
      <div className="hud-film hud-film-still" role="img" aria-label="תמונה מן הסרט">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt="" />
      </div>
    )
  }
  return (
    <div className="hud-film-wrap">
      <video
        ref={ref}
        key={file}
        className="hud-film"
        src={`/assets/anim-video/${file}`}
        poster={poster}
        loop={!once}
        playsInline
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        aria-hidden="true"
      />
      {/* הפקדים יושבים על הסרט ולא בזרימת הטקסט, ולחיצה עליהם אינה
          מקדמת את השיחה — הלחיצה על החלונית היא ההתקדמות. */}
      <div className="hud-film-controls" onClick={(ev) => ev.stopPropagation()}>
        <button type="button" className="hud-film-btn" onClick={toggle}
                aria-label={playing ? 'להשהות את הסרטון' : 'להפעיל את הסרטון'}>
          {playing ? '❚❚ השהו' : '▶ הפעילו'}
        </button>
        <button type="button" className="hud-film-btn" onClick={toggleSound}
                aria-label={muted ? 'להפעיל קול' : 'להשתיק'}>
          {muted ? '🔇 קול' : '🔊 קול'}
        </button>
      </div>
    </div>
  )
}

function buildSteps(e: Encounter): Step[] {
  return encounterScript(e).map(({ speaker, line }) => ({
    speaker,
    text: line.text,
    source: line.source,
  }))
}

export function DialogueHud({
  encounter,
  handoff,
  decide,
  onSpeakerChange,
  onFinished,
  onClose,
}: {
  encounter: Encounter
  /** מה התחנה מבקשת לעשות עכשיו. כשיש דבר כזה, השיחה אינה מציעה
      „המשך" — היא מוסרת את התור ליד, וממשיכה אחרי שהיא עשתה. */
  handoff?: string | null
  /** שיחה שנגמרת בהכרעה ולא בסגירה: ראאווי עוצר בשער ושואל אם להמשיך
      לחקור או להתקדם. „להישאר" הוא פשוט סגירת החלונית — השחקן חוזר אל
      המקום שבו הוא עומד; „להתקדם" הוא המעבר עצמו. */
  decide?: { stay: string; go: string; onGo: () => void } | null
  /** Lets the 3D layer play the right gesture / turn the right head. */
  onSpeakerChange?: (speaker: SpeakerId) => void
  onFinished: (e: Encounter) => void
  onClose: () => void
}) {
  /* כל ה-state כאן שייך לשיחה אחת ולא לרכיב.
     הרכיב נשאר מותקן כשעוברים ממפגש למפגש, ולכן `i`, `revealed`,
     `asked`, `interlude` ו-`filed` עברו ביניהם. התוצאה, בסדר חומרתה:
       · שיחה חדשה שקצרה מקודמתה נפתחה על שורתה האחרונה (`i` נחתך
         כלפי מטה ב-Math.min), ולכן היא נראתה כמי שנסגרה מיד;
       · `filed` שנשאר true פירושו ש-onFinished לא נקרא — כלומר
         המפגש כלל לא נרשם במחברת;
       · „המשך" נראה כאילו לא עשה דבר, כי כבר היינו בסוף.
     הקורא ב-Game.tsx מעביר עכשיו key={encounter.id}, ולכן הרכיב
     נטען מחדש בכל מפגש. האיפוס המפורש כאן הוא רשת שנייה, למקרה
     שמישהו ישכח את ה-key. */
  const steps = useMemo(() => buildSteps(encounter), [encounter])
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(0)
  const [asked, setAsked] = useState<string[]>([])
  /** A chosen question's answer plays as an interlude before the main script resumes. */
  const [interlude, setInterlude] = useState<Step[] | null>(null)
  const [filed, setFiled] = useState(false)
  const timer = useRef<number | null>(null)

  /* ── חזרה מתשובה ─────────────────────────────────────────────────
     אחרי כל נושא שנבחר הרכיב חוזר לשורה האחרונה של השיחה הראשית —
     שורה שכבר נשמעה — והקליד אותה מחדש מאפס. לכן, גם כשנגמרו כל
     הנושאים, הופיע שוב „להשלמת השורה · רווח או לחיצה" במקום „סיום
     שיחה". שורה שכבר נשמעה מוצגת שלמה מיד, וההכרעה (עוד נושא / סיום)
     מופיעה בלי לחיצה נוספת. */
  const heard = useRef<Set<string>>(new Set())

  const lastId = useRef(encounter.id)
  if (lastId.current !== encounter.id) {
    lastId.current = encounter.id
    heard.current = new Set()
    setI(0)
    setRevealed(0)
    setAsked([])
    setInterlude(null)
    setFiled(false)
  }

  const active = interlude ?? steps
  const step = active[Math.min(i, active.length - 1)]
  const full = step?.text ?? ''
  const complete = revealed >= full.length
  /* שתי לחיצות מהירות בין רינדורים קוראות את אותו closure ישן: הראשונה
     משלימה את השורה, השנייה "משלימה" שוב במקום להתקדם — לחיצה שנבלעת
     (דוח השחקנית, ממצא 5). ה-ref מתעדכן מיידית ולא מחכה לרינדור. */
  const completeRef = useRef(complete)
  completeRef.current = complete

  useEffect(() => {
    onSpeakerChange?.(step?.speaker ?? 'narrator')
  }, [step?.speaker, onSpeakerChange])

  // reveal the current line
  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current)
    if (heard.current.has(full)) {
      setRevealed(full.length)
      return
    }
    setRevealed(0)
    timer.current = window.setInterval(() => {
      setRevealed((r) => {
        if (r >= full.length) {
          if (timer.current) window.clearInterval(timer.current)
          return r
        }
        return r + 1
      })
    }, REVEAL_MS_PER_CHAR)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [full])

  const remainingChoices: Choice[] = useMemo(
    () => (encounter.choices ?? []).filter((c) => !asked.includes(c.prompt)),
    [encounter.choices, asked],
  )

  if (complete && full) heard.current.add(full)
  const atScriptEnd = !interlude && i >= steps.length - 1 && complete
  const showChoices = atScriptEnd && remainingChoices.length > 0
  const showDone = atScriptEnd && remainingChoices.length === 0

  // file the notebook entry once the script has been heard through
  useEffect(() => {
    if (atScriptEnd && !filed) {
      setFiled(true)
      onFinished(encounter)
    }
  }, [atScriptEnd, filed, encounter, onFinished])

  const advance = useCallback(() => {
    if (!completeRef.current) {
      setRevealed(full.length)
      completeRef.current = true
      return
    }
    if (interlude) {
      if (i < interlude.length - 1) setI(i + 1)
      else {
        setInterlude(null)
        setI(steps.length - 1)
      }
      return
    }
    if (i < steps.length - 1) setI(i + 1)
  }, [full.length, i, interlude, steps.length])

  const pickChoice = useCallback((c: Choice) => {
    setAsked((a) => [...a, c.prompt])
    /* an answer can come from someone other than the person asked — Rawi
       cutting in on the envoy is the whole point of a travelling companion */
    setInterlude(c.lines.map((l) => ({ speaker: l.speaker ?? encounter.speaker, text: l.text, source: l.source })))
    setI(0)
  }, [encounter.speaker])

  // keyboard: space/enter advances, escape closes once the entry is filed
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === ' ' || ev.key === 'Enter') {
        /* ── הקשה אחת, התקדמות אחת ──────────────────────────────────
           רווח על כפתור שנמצא במיקוד מפעיל את הכפתור בברירת המחדל של
           הדפדפן, ולכן בחירת נושא בעכבר הפכה כל רווח שאחריה לשתי
           פעולות. `preventDefault` מבטל את הפעלת הכפתור, ו-blur מוציא
           את המיקוד מן הפאנל כדי ש-Enter (שפועל ב-keydown על כפתור,
           לפני שהמניעה מגיעה אליו בדפדפנים מסוימים) לא יעשה זאת גם כן. */
        ev.preventDefault()
        const a = document.activeElement
        if (a instanceof HTMLElement && a.closest('.hud-dialogue')) a.blur()
        /* במסך השאלות רווח מדלג וסוגר — השאלות הן העשרה למי שסקרן,
           לא שער חובה. מי שרוצה לשאול — לוחץ. */
        if (showDone || showChoices) onClose()
        else advance()
      }
      if (ev.key === 'Escape') {
        if (showDone || showChoices) onClose()
        else {
          /* דילוג: קפיצה לסוף המפגש — לחיצה שנייה תסגור. עדיף על מקש
             שמתעלם ממך (דוח השחקנית). */
          setInterlude(null)
          setI(steps.length - 1)
          setRevealed(Number.MAX_SAFE_INTEGER)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, onClose, showChoices, showDone])

  if (!step) return null
  const portrait = PORTRAIT[step.speaker]
  const cinematic = encounter.kind === 'cinematic' && step.speaker === 'narrator'

  return (
    <>
      {/* An encounter with a film is a screening, and a screening needs the room
          dark. Without this the picture competed with a lit desert behind it and
          read as a widget floating over the game rather than as a cut to film. */}
      {encounter.film && (
        <div
          className="ch1-cinema-scrim"
          aria-hidden="true"
          onClick={() => (showChoices || showDone ? undefined : advance())}
        />
      )}
    <div
      className={`hud-panel hud-dialogue is-open is-anchored${cinematic ? ' is-cinematic' : ''}${encounter.film ? ' has-film' : ''}`}
      onClick={() => (showChoices || showDone ? undefined : advance())}
      role="dialog"
      aria-live="polite"
    >
      {portrait ? (
        <img className="hud-portrait" src={portrait} alt="" />
      ) : (
        <div className="hud-portrait hud-speaker-avatar" aria-hidden>
          ״
        </div>
      )}
      <div className="hud-dialogue-body">
        {/* סרט קצר לצד הטקסט — רק במפגשים שמצהירים עליו. חמישה סרטים
            גמורים יושבים בנכסים; אחד בלבד נאמן לתקופה של הפרק, והשאר
            מחכים לסרטים שייעשו לרגעים האלה. שקט ובלולאה: הקריינות
            המוקלדת היא הקול. */}
        {encounter.film && <FilmFrame file={encounter.film} once={!!encounter.filmOnce} />}
        {/* דילוג נראה — Escape עושה את אותו הדבר, אבל מקש סמוי אינו הזמנה
            (דוח הוועדה: "דילוג לא אומת — אין כפתור נראה") */}
        {encounter.film && !showDone && !showChoices && (
          <button
            type="button"
            className="hud-film-skip"
            onClick={(ev) => {
              ev.stopPropagation()
              setInterlude(null)
              setI(steps.length - 1)
              setRevealed(Number.MAX_SAFE_INTEGER)
            }}
          >
            דלגו על הסרט ‹
          </button>
        )}
        {/* מספר הסעיף במקור (§) הוא סימון של הכותבים, לא של הלומד — הוא
            נשאר בנתונים בשביל שער הנאמנות ואינו מוצג עוד. */}
        <h3 className="hud-title">{SPEAKERS[step.speaker]}</h3>
        <p className="is-full">
          {full.slice(0, revealed)}
          <span className="hud-reveal-rest">{full.slice(revealed)}</span>
        </p>

        {showChoices && (
          <div className="hud-choices">
            {remainingChoices.map((c) => (
              <button
                key={c.prompt}
                className="hud-card-btn"
                onClick={(ev) => {
                  ev.stopPropagation()
                  pickChoice(c)
                }}
              >
                {c.prompt}
              </button>
            ))}
            <button
              className="hud-card-btn is-primary"
              onClick={(ev) => {
                ev.stopPropagation()
                onClose()
              }}
            >
              מספיק לי — נמשיך
            </button>
          </div>
        )}

        <div className="hud-dialogue-actions">
          {/* „נרשם במחברת" רק כשבאמת נרשם. פעימות בלי רשומה — ברכת ההיכרות
              ומשפטי ההגעה — נושאות notebook: 0 ואינן נכנסות למחברת, והשורה
              הזאת הצהירה עליהן שכן, ליד מונה שנשאר על אותו מספר. */}
          {/* המונה „0 מתוך 26“ ירד. מחסן של 26 פריטים אינו מדד להתקדמות
              בפרק — הוא רק מודיע לשחקן, בכל שיחה, כמה עוד לא עשה. מה
              שקרה בפועל — „זה נרשם“ — נשאר, וההתקדמות נמדדת בתחנות
              בשורה שמתחת. */}
          <span className="hud-dialogue-count">
            {showDone && encounter.notebook > 0 ? '✓ נרשם במחברת' : ''}
          </span>
          {/* ── אין כפתור „לשורה הבאה" ────────────────────────────────
              ההתקדמות בשיחה היא לחיצה או רווח, ותו לא. הכפתור שעמד כאן
              היה דרך שלישית לאותה פעולה, והוא גם היה מוקד מיקוד: אחרי
              לחיצה עליו הוא נשאר focused, ורווח הבא הפעיל גם את מטפל
              המקלדת וגם את הכפתור — שתי התקדמויות בהקשה אחת. השורה
              שמתחת אומרת מה עושים. */}
          {/* ── מסירת התור ליד ──────────────────────────────────────────
              כשהתחנה מחכה לפעולה פיזית, הכפתור אינו „סיום שיחה" סתם —
              הוא אומר מה ללכת לעשות, והשיחה הבאה תיפתח רק אחריה.
              „המשך" שמופיע כאן היה מבטיח שיש עוד מה לשמוע, וזה בדיוק
              מה שלא נכון: יש עוד מה לעשות. */}
          {showDone && (
            decide ? (
              <>
                <button
                  className="hud-card-btn is-primary"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onClose()
                  }}
                >
                  {decide.stay}
                </button>
                <button
                  className="hud-card-btn"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    decide.onGo()
                  }}
                >
                  {decide.go}
                </button>
              </>
            ) : (
              <button
                className="hud-card-btn is-primary"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onClose()
                }}
              >
                {handoff ? 'לעבודה ←' : 'סיום שיחה'}
              </button>
            )
          )}
          {showDone && handoff && (
            <span className="hud-dialogue-handoff">{handoff}</span>
          )}
          {/* זו ההנחיה היחידה שאומרת לשחקן איך להמשיך, והיא הייתה
              הטקסט הכי חיוור בחלונית. „לחיצה משלימה“ גם נקרא כמו
              „הלחיצה היא משלימה“ ולא כמו הוראה. */}
          {!showChoices && !showDone && (
            <span className="hud-dialogue-hint">רווח או לחיצה</span>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
