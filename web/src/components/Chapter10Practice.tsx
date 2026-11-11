'use client'

/* Chapter 10's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:10 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch10:practice:v1` = {done, missed, work}
   (lib/chapter10/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter10/practice.json'
import { CH10 } from '@/lib/chapter10/content'
import { markChapterComplete } from '@/lib/chapter10/progress'
import { readPractice, writePractice } from '@/lib/chapter10/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter10Practice() {
  return (
    <PracticeEngine
      chapter={10}
      title={CH10.title}
      questions={QUESTIONS}
      art="/assets/chapter10/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter10', label: 'חזרה לפרק 10' }}
      banner={{ className: 'ch10-practice-banner', mediaClassName: 'ch10-practice-media' }}
    />
  )
}
