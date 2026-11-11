'use client'

/* Chapter 16's closing practice (11.11.2026) — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is.

   `islam:chapter:16 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch16:practice:v1` = {done, missed, work}
   (lib/chapter16/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on; the gate is concept/chapter16/verify-practice.mjs. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter16/practice.json'
import { CH16 } from '@/lib/chapter16/content'
import { markChapterComplete } from '@/lib/chapter16/progress'
import { readPractice, writePractice } from '@/lib/chapter16/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter16Practice() {
  return (
    <PracticeEngine
      chapter={16}
      title={CH16.title}
      questions={QUESTIONS}
      art="/assets/chapter16/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter16', label: 'חזרה לפרק 16' }}
      banner={{ className: 'ch16-practice-banner', mediaClassName: 'ch16-practice-media' }}
    />
  )
}
