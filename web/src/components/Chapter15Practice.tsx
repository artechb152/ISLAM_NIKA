'use client'

/* Chapter 15's closing practice (11.11.2026) — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is.

   `islam:chapter:15 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch15:practice:v1` = {done, missed, work}
   (lib/chapter15/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on; the gate is concept/chapter15/verify-practice.mjs. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter15/practice.json'
import { CH15 } from '@/lib/chapter15/content'
import { markChapterComplete } from '@/lib/chapter15/progress'
import { readPractice, writePractice } from '@/lib/chapter15/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter15Practice() {
  return (
    <PracticeEngine
      chapter={15}
      title={CH15.title}
      questions={QUESTIONS}
      art="/assets/chapter15/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter15', label: 'חזרה לפרק 15' }}
      banner={{ className: 'ch15-practice-banner', mediaClassName: 'ch15-practice-media' }}
    />
  )
}
