'use client'

/* Chapter 14's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:14 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch14:practice:v1` = {done, missed, work}
   (lib/chapter14/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter14/practice.json'
import { CH14 } from '@/lib/chapter14/content'
import { markChapterComplete } from '@/lib/chapter14/progress'
import { readPractice, writePractice } from '@/lib/chapter14/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter14Practice() {
  return (
    <PracticeEngine
      chapter={14}
      title={CH14.title}
      questions={QUESTIONS}
      art="/assets/chapter14/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter14', label: 'חזרה לפרק 14' }}
      banner={{ className: 'ch14-practice-banner', mediaClassName: 'ch14-practice-media' }}
    />
  )
}
