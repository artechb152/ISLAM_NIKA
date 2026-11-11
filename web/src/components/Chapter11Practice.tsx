'use client'

/* Chapter 11's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:11 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch11:practice:v1` = {done, missed, work}
   (lib/chapter11/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter11/practice.json'
import { CH11 } from '@/lib/chapter11/content'
import { markChapterComplete } from '@/lib/chapter11/progress'
import { readPractice, writePractice } from '@/lib/chapter11/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter11Practice() {
  return (
    <PracticeEngine
      chapter={11}
      title={CH11.title}
      questions={QUESTIONS}
      art="/assets/chapter11/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter11', label: 'חזרה לפרק 11' }}
      banner={{ className: 'ch11-practice-banner', mediaClassName: 'ch11-practice-media' }}
    />
  )
}
