'use client'

/* Chapter 8's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:8 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch8:practice:v1` = {done, missed, work}
   (lib/chapter8/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on.

   A plate whose file starts `cut-` is a cut-out and sits bare on the page (rule 45). */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter8/practice.json'
import { CH8 } from '@/lib/chapter8/content'
import { markChapterComplete } from '@/lib/chapter8/progress'
import { readPractice, writePractice } from '@/lib/chapter8/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter8Practice() {
  return (
    <PracticeEngine
      chapter={8}
      title={CH8.title}
      questions={QUESTIONS}
      art="/assets/chapter8/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter8', label: 'חזרה לפרק 8' }}
      banner={{ className: 'ch8-practice-banner', mediaClassName: 'ch8-hero-media' }}
      isCut={(p) => p.startsWith('cut-')}
    />
  )
}
