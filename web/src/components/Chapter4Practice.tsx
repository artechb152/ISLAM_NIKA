'use client'

/* Chapter 4's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is.

   Until 11.11.2026 this was the engine again under `p4-*` names — and its lead printed a
   developer's note („(ללא שינוי בטקסט; לאחד עם פרק 5 …)") where the derived count belongs. The
   lead is the shared one now.

   Unchanged: `ch4:practice:v1` = {done, missed, work} (lib/chapter4/practice-progress.ts),
   including the reset that clears the answers and NOT `islam:chapter:4`; the `p4-` anchors; and
   the closing block's way back into the chapter, one link per section, read from the layout like
   every other name in this product. Its „שווה לחזור אל" line is gone: the score under „הפרק
   הושלם." lists the same questions under „לחזרה". */

import Link from 'next/link'
import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter4/practice.json'
import layout from '@/lib/chapter4/layout.json'
import { CH4 } from '@/lib/chapter4/content'
import { markChapterComplete } from '@/lib/chapter4/progress'
import { readPractice, resetPractice, writePractice } from '@/lib/chapter4/practice-progress'

/* `photo` names a file from the chapter's own assets. ⚠ Six of them (stage-3-night,
   stage-4-arrival, trench-after, kaaba-precinct, mosque-yard, uhud-mount) are no longer printed
   on the chapter page — see $photos-note in practice.json. */
const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const SECTIONS = (layout as { sections: { id: string; title: string }[] }).sections
const STORE = { read: readPractice, write: writePractice, reset: resetPractice }

export default function Chapter4Practice() {
  return (
    <PracticeEngine
      chapter={4}
      title={CH4.title}
      questions={QUESTIONS}
      art="/assets/chapter4/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter4#chapter-end', label: 'חזרה לפרק 4' }}
      banner={{
        prefix: 'ch4',
        className: 'p4-banner',
        // eslint-disable-next-line @next/next/no-img-element
        media: <img src="/assets/chapter4/hero-road.jpg" alt="" />,
      }}
      idPrefix="p4-"
      doneExtra={
        <>
          <p className="p4-end-nav">חזרה לפרק:</p>
          <ul className="p4-end-frieze">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <Link className="p4-end-sec" href={`/chapter4#${sec.id}`}>{sec.title}</Link>
              </li>
            ))}
          </ul>
        </>
      }
    />
  )
}
