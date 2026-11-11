'use client'

/* Chapter 9's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:9 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch9:practice:v1` = {done, missed, work}
   (lib/chapter9/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter9/practice.json'
import { CH9 } from '@/lib/chapter9/content'
import { markChapterComplete } from '@/lib/chapter9/progress'
import { readPractice, writePractice } from '@/lib/chapter9/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter9Practice() {
  return (
    <PracticeEngine
      chapter={9}
      title={CH9.title}
      questions={QUESTIONS}
      art="/assets/chapter9/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter9', label: 'חזרה לפרק 9' }}
      banner={{ className: 'ch9-practice-banner', mediaClassName: 'ch9-practice-media' }}
    />
  )
}
