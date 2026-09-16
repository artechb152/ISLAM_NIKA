'use client'

/* ── דף מלווה: השאלה, חמש החוליות, והתשובה ───────────────────────────────
 *
 * הפרק הוא מסע, ומסע נקרא ברגליים. הדף הזה הוא מה שנשאר ממנו על הנייר:
 * שאלת §0 למעלה, חמשת הנושאים שהחוברת פורשת כתשובה, המשפט שכל אחד מהם
 * תורם — בניסוח הסעיף — והמסקנה של §9 ו-§48.
 *
 * אין כאן שורה שנכתבה לדף הזה: כל משפט מגיע מ-links.ts ומ-dialogue.json,
 * שנבדקים מול SOURCE-TEXT בשערי הנאמנות. הקומפוננטה מסדרת, לא כותבת.
 *
 * שאלות הרפלקציה הן רב-ברירה ולא פתוחות: בניסויים על משחקים לימודיים
 * שחקנים שבחרו סיבה מתוך רשימה השתפרו בהעברה, ומי שהתבקשו להקליד הסבר
 * חופשי לא השתפרו כלל. */

import Link from 'next/link'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import { CHAPTER_QUESTION, LINKS } from '@/lib/chapter1/links'
import { REGIONS } from '@/lib/chapter1/dialogue'
import practice from '@/lib/chapter1/practice.json'

const EXIT = REGIONS.find((r) => r.id === 'exit')
const ECHOES = EXIT?.encounters.find((e) => e.id === 'rawi-echoes')
const CHECKPOINT = REGIONS.find((r) => r.id === 'narrow-pass')?.encounters.find((e) => e.id === 'rawi-checkpoint')

export default function Chapter1Guide() {
  const stops = [
    { id: 'g-question', label: 'השאלה', done: false },
    { id: 'g-links', label: 'חמש החוליות', done: false },
    { id: 'g-answer', label: 'התשובה', done: false },
    { id: 'g-next', label: 'הלאה מכאן', done: false },
  ]
  return (
    <PracticeNav
      stops={stops}
      title="דף מלווה"
      subtitle="פרק 1 · ערב טרום האסלאם"
      back={{ href: '/chapter1', label: 'חזרה לפרק 1' }}
    >
      <main className="chapter-article p2-main">
        <div className="ch2-hero p1-banner">
          <div className="ch2-hero-media" aria-hidden="true" />
          <div className="ch2-hero-copy">
            <h1 id="p1-title" className="ch2-hero-title">
              מה הדרך הזאת מלמדת
            </h1>
          </div>
        </div>

        <p className="p2-lead">
          עמוד אחד שמסכם את המסע: השאלה שהפרק נפתח בה, חמשת הנושאים שהחוברת פורשת כתשובה,
          והמשפט שכל אחד מהם תורם. אפשר לקרוא לפני המסע, אחריו, או במקום מחברת.
        </p>

        <section className="article-section" id="g-question" aria-labelledby="g-question-t">
          <header className="section-heading">
            <div>
              <h2 id="g-question-t">השאלה</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
          </header>
          <p className="p1-guide-question">{CHAPTER_QUESTION.text}</p>
          <p className="p1-guide-note">
            כדי לענות עליה צריך להכיר את התרבות, הציוויליזציה והחיים בחצי האי ערב טרום עליית האסלאם —
            וזו הדרך שהמסע עושה, תחנה אחר תחנה.
          </p>
        </section>

        <section className="article-section" id="g-links" aria-labelledby="g-links-t">
          <header className="section-heading">
            <div>
              <h2 id="g-links-t">חמש החוליות</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
          </header>
          <ol className="p1-guide-links">
            {LINKS.map((l) => (
              <li key={l.id}>
                <b>{l.label}</b>
                <span>{l.key.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="article-section" id="g-answer" aria-labelledby="g-answer-t">
          <header className="section-heading">
            <div>
              <h2 id="g-answer-t">התשובה</h2>
            </div>
            <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
          </header>
          <div className="p1-guide-answer">
            {CHECKPOINT?.lines.map((l, i) => <p key={`c${i}`}>{l.text}</p>)}
            {ECHOES?.lines.map((l, i) => <p key={`e${i}`}>{l.text}</p>)}
          </div>
          <h3 className="p1-guide-sub">מה לוקחים מכאן</h3>
          <ul className="p1-guide-takeaways">
            {(practice.takeaways as { source: string; text: string }[]).map((t, i) => (
              <li key={i}>{t.text}</li>
            ))}
          </ul>
        </section>

        <div className="p2-done" id="g-next" role="status">
          <div className="title-ornament" aria-hidden="true"><span /></div>
          <p>עכשיו אפשר לבדוק את זה.</p>
          <nav className="p1-entry-actions" aria-label="הלאה מכאן">
            <Link className="ch2-end-link" href="/chapter1/practice">לתרגול המסכם</Link>
            <Link className="hud-card-btn" href="/chapter1">חזרה למסע</Link>
          </nav>
        </div>
      </main>
    </PracticeNav>
  )
}
