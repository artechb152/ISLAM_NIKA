'use client'

/* Chapter 2's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:2 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch2:practice:v1` = {done, missed, work}
   (lib/chapter2/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter2/practice.json'
import { CH2 } from '@/lib/chapter2/content'
import { markChapterComplete } from '@/lib/chapter2/progress'
import { readPractice, writePractice } from '@/lib/chapter2/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter2Practice() {
  return (
    <PracticeEngine
      chapter={2}
      title={CH2.title}
      questions={QUESTIONS}
      art="/assets/chapter2/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter2', label: 'חזרה לפרק 2' }}
      banner={{ prefix: 'ch2' }}
    />
  )
}
