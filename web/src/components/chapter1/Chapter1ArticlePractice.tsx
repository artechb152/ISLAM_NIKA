'use client'

/* Chapter 1's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:1 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch1:practice:v1` = {done, missed, work}
   (lib/chapter1/article/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter1/article/practice.json'
import { CH1 } from '@/lib/chapter1/article/content'
import { markChapterComplete } from '@/lib/chapter1/article/progress'
import { readPractice, writePractice } from '@/lib/chapter1/article/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter1ArticlePractice() {
  return (
    <PracticeEngine
      chapter={1}
      title={CH1.title}
      questions={QUESTIONS}
      art="/assets/chapter1/article/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter1', label: 'חזרה לפרק 1' }}
      banner={{ className: 'ch1-practice-banner', mediaClassName: 'ch1-practice-media' }}
    />
  )
}
