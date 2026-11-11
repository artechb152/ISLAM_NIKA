'use client'

/* Chapter 13's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:13 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch13:practice:v1` = {done, missed, work}
   (lib/chapter13/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on.

   Reached from the hall once all sixteen cards were read; the hall reads the flag for its „הושלם" chip. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter13/practice.json'
import passages from '@/lib/chapter13/passages.json'
import { markChapterComplete } from '@/lib/chapter13/progress'
import { readPractice, writePractice } from '@/lib/chapter13/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter13Practice() {
  return (
    <PracticeEngine
      chapter={13}
      title={passages.title}
      questions={QUESTIONS}
      art="/assets/chapter13/flags/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter13', label: 'חזרה לפרק 13' }}
      banner={{ className: 'ch13-practice-banner', mediaClassName: 'ch13-practice-media' }}
    />
  )
}
