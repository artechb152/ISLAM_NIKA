'use client'

/* Chapter 12's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:12 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch12:practice:v1` = {done, missed, work}
   (lib/chapter12/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter12/practice.json'
import { CH12 } from '@/lib/chapter12/content'
import { markChapterComplete } from '@/lib/chapter12/progress'
import { readPractice, writePractice } from '@/lib/chapter12/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter12Practice() {
  return (
    <PracticeEngine
      chapter={12}
      title={CH12.title}
      questions={QUESTIONS}
      art="/assets/chapter12/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter12', label: 'חזרה לפרק 12' }}
      banner={{ className: 'ch12-practice-banner', mediaClassName: 'ch12-practice-media' }}
    />
  )
}
