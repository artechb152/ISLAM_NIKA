'use client'

/* Chapter 5's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:5 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch5:practice:v1` = {done, missed, work}
   (lib/chapter5/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter5/practice.json'
import { CH5 } from '@/lib/chapter5/content'
import { markChapterComplete } from '@/lib/chapter5/progress'
import { readPractice, writePractice } from '@/lib/chapter5/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter5Practice() {
  return (
    <PracticeEngine
      chapter={5}
      title={CH5.title}
      questions={QUESTIONS}
      art="/assets/chapter5/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter5', label: 'חזרה לפרק 5' }}
      banner={{ className: 'ch5-practice-banner', mediaClassName: 'ch5-hero-media' }}
    />
  )
}
