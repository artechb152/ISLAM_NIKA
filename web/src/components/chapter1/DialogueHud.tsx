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

function buildSteps(e: Encounter): Step[] {
  return encounterScript(e).map(({ speaker, line }) => ({
    speaker,
    text: line.text,
    source: line.source,
  }))
}

export function DialogueHud({
  encounter,
  notebookDone,
  notebookTotal,
  onSpeakerChange,
  onFinished,
  onClose,
}: {
  encounter: Encounter
  notebookDone: number
  notebookTotal: number
  /** Lets the 3D layer play the right gesture / turn the right head. */
  onSpeakerChange?: (speaker: SpeakerId) => void
  onFinished: (e: Encounter) => void
  onClose: () => void
}) {
  const steps = useMemo(() => buildSteps(encounter), [encounter])
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(0)
  const [asked, setAsked] = useState<string[]>([])
  /** A chosen question's answer plays as an interlude before the main script resumes. */
  const [interlude, setInterlude] = useState<Step[] | null>(null)
  const [filed, setFiled] = useState(false)
  const timer = useRef<number | null>(null)

  const active = interlude ?? steps
  const step = active[Math.min(i, active.length - 1)]
  const full = step?.text ?? ''
  const complete = revealed >= full.length

  useEffect(() => {
    onSpeakerChange?.(step?.speaker ?? 'narrator')
  }, [step?.speaker, onSpeakerChange])

  // reveal the current line
  useEffect(() => {
    setRevealed(0)
    if (timer.current) window.clearInterval(timer.current)
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
    if (!complete) {
      setRevealed(full.length)
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
  }, [complete, full.length, i, interlude, steps.length])

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
        ev.preventDefault()
        /* במסך השאלות רווח מדלג וסוגר — השאלות הן העשרה למי שסקרן,
           לא שער חובה. מי שרוצה לשאול — לוחץ. */
        if (showDone || showChoices) onClose()
        else advance()
      }
      if (ev.key === 'Escape' && showDone) onClose()
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
        {encounter.film && (
          <video
            className="hud-film"
            src={`/assets/anim-video/${encounter.film}`}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
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
          <span className="hud-dialogue-count">
            {showDone && encounter.notebook > 0 ? '✓ נרשם במחברת · ' : ''}
            מחברת: {notebookDone} מתוך {notebookTotal}
          </span>
          {showDone && (
            <button
              className="hud-card-btn is-primary"
              onClick={(ev) => {
                ev.stopPropagation()
                onClose()
              }}
            >
              המשך ←
            </button>
          )}
          {/* זו ההנחיה היחידה שאומרת לשחקן איך להמשיך, והיא הייתה
              הטקסט הכי חיוור בחלונית. „לחיצה משלימה“ גם נקרא כמו
              „הלחיצה היא משלימה“ ולא כמו הוראה. */}
          {!showChoices && !showDone && (
            <span className="hud-dialogue-hint">
              {complete ? 'רווח או לחיצה — להמשך' : 'לחצו להשלמת השורה'}
            </span>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
